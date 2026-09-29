import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { normalizeKoreanPhone } from "@/src/lib/phone";

const OTP_EXPIRES_IN_SECONDS = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = normalizeKoreanPhone(body.phone ?? "");
    const purpose = body.purpose;

    // 현재는 계정 찾기 용도만 허용
    if (purpose !== "account-recovery") {
      return NextResponse.json(
        {
          error: "올바르지 않은 인증 요청입니다.",
        },
        {
          status: 400,
        }
      );
    }

    // 휴대폰 번호 형식 확인
    if (!phone) {
      return NextResponse.json(
        {
          error: "올바른 휴대폰 번호를 입력해 주세요.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Vonage 환경 변수 확인

      등록된 번호와 등록되지 않은 번호 모두
      서버 설정 오류에 대해 동일하게 동작하도록
      profiles 조회보다 먼저 확인합니다.
    */
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const brandName =
      process.env.VONAGE_BRAND_NAME || "ProjectNode";

    if (!apiKey || !apiSecret) {
      console.error(
        "Vonage API 환경 변수가 설정되지 않았습니다."
      );

      return NextResponse.json(
        {
          error: "인증번호 발송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      가입된 휴대폰 번호인지 profiles에서 확인합니다.

      이 조회는 관리자용 Supabase 클라이언트로
      서버에서만 수행합니다.
    */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

    if (profileError) {
      console.error(
        "휴대폰 번호 조회 오류:",
        profileError
      );

      return NextResponse.json(
        {
          error: "인증번호 발송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      DB에는 OTP의 실제 만료 시각을 저장합니다.

      Vonage의 channel_timeout = 300과 동일하게
      서버에서도 5분으로 관리합니다.
    */
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + OTP_EXPIRES_IN_SECONDS * 1000
    );

    /*
      등록된 번호라면 Vonage에서 받은 실제 request_id가 들어가고,
      등록되지 않은 번호라면 null 상태로 유지됩니다.

      이 값은 브라우저에는 절대 반환하지 않습니다.
    */
    let vonageRequestId: string | null = null;

    /*
      가입된 전화번호에 대해서만 실제 SMS를 발송합니다.
    */
    if (profile) {
      /*
        Basic Auth

        API_KEY:API_SECRET
              ↓
            Base64
      */
      const credentials = Buffer.from(
        `${apiKey}:${apiSecret}`
      ).toString("base64");

      const vonageResponse = await fetch(
        "https://api.nexmo.com/v2/verify",
        {
          method: "POST",

          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            brand: brandName,
            code_length: 6,
            channel_timeout: OTP_EXPIRES_IN_SECONDS,

            workflow: [
              {
                channel: "sms",
                to: phone,
              },
            ],
          }),
        }
      );

      const vonageData = await vonageResponse.json();

      if (!vonageResponse.ok) {
        console.error(
          "Vonage 인증번호 발송 오류:",
          vonageData
        );

        return NextResponse.json(
          {
            error: "인증번호 발송 중 오류가 발생했습니다.",
          },
          {
            status: 500,
          }
        );
      }

      /*
        Vonage 응답이 성공했지만 request_id가 없는
        비정상적인 상황도 확인합니다.
      */
      if (
        !vonageData.request_id ||
        typeof vonageData.request_id !== "string"
      ) {
        console.error(
          "Vonage 응답에 request_id가 없습니다:",
          vonageData
        );

        return NextResponse.json(
          {
            error: "인증번호 발송 중 오류가 발생했습니다.",
          },
          {
            status: 500,
          }
        );
      }

      vonageRequestId = vonageData.request_id;
    }

    /*
      인증 요청 정보를 서버 DB에 저장합니다.

      id는 phone_verification_requests 테이블의
      gen_random_uuid()가 자동으로 생성합니다.

      등록된 번호:
      vonage_request_id = 실제 Vonage request_id

      등록되지 않은 번호:
      vonage_request_id = null

      두 경우 모두 브라우저에는 DB의 id만 반환합니다.
    */
    const {
      data: verificationRequest,
      error: verificationRequestError,
    } = await supabaseAdmin
      .from("phone_verification_requests")
      .insert({
        phone,
        purpose,
        vonage_request_id: vonageRequestId,
        expires_at: expiresAt.toISOString(),
        last_sent_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (
      verificationRequestError ||
      !verificationRequest
    ) {
      console.error(
        "인증 요청 DB 저장 오류:",
        verificationRequestError
      );

      return NextResponse.json(
        {
          error: "인증번호 발송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      브라우저에는 Vonage request_id를 노출하지 않습니다.

      verificationId는 우리 DB의 인증 요청 id입니다.

      expiresIn은 이후 프론트에서
      05:00 카운트다운을 표시할 때 사용할 수 있습니다.
    */
    return NextResponse.json({
      success: true,
      verificationId: verificationRequest.id,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    console.error(
      "휴대폰 인증번호 발송 API 오류:",
      error
    );

    return NextResponse.json(
      {
        error: "인증번호 발송 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}