import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/src/lib/supabase-admin";

const OTP_EXPIRES_IN_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESEND_COUNT = 3;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const verificationId = body.verificationId?.trim();

    if (!verificationId) {
      return NextResponse.json(
        {
          error: "인증 요청 정보가 없습니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      verificationId를 기준으로
      서버 DB에서 인증 요청 정보를 가져옵니다.
    */
    const {
      data: verificationRequest,
      error: verificationRequestError,
    } = await supabaseAdmin
      .from("phone_verification_requests")
      .select(
        `
          id,
          phone,
          purpose,
          vonage_request_id,
          expires_at,
          verified_at,
          resend_count,
          last_sent_at
        `
      )
      .eq("id", verificationId)
      .maybeSingle();

    if (verificationRequestError) {
      console.error(
        "재전송 인증 요청 조회 오류:",
        verificationRequestError
      );

      return NextResponse.json(
        {
          error: "인증번호 재전송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    if (!verificationRequest) {
      return NextResponse.json(
        {
          error:
            "인증 요청이 존재하지 않거나 만료되었습니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      현재는 계정 찾기 인증만 허용합니다.
    */
    if (
      verificationRequest.purpose !== "account-recovery"
    ) {
      return NextResponse.json(
        {
          error: "올바르지 않은 인증 요청입니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      이미 인증이 완료된 요청은 재전송할 수 없습니다.
    */
    if (verificationRequest.verified_at) {
      return NextResponse.json(
        {
          error: "이미 완료된 인증 요청입니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      같은 인증 요청에서 재전송할 수 있는 횟수를 제한합니다.
    */
    if (
      verificationRequest.resend_count >=
      MAX_RESEND_COUNT
    ) {
      return NextResponse.json(
        {
          error:
            "인증번호 재전송 횟수를 초과했습니다. 처음부터 다시 요청해 주세요.",
        },
        {
          status: 429,
        }
      );
    }

    /*
      마지막 발송 이후 60초가 지나야 다시 보낼 수 있습니다.
    */
    const lastSentAt = new Date(
      verificationRequest.last_sent_at
    );

    const nextResendAt =
      lastSentAt.getTime() +
      RESEND_COOLDOWN_SECONDS * 1000;

    const remainingCooldown = Math.ceil(
      (nextResendAt - Date.now()) / 1000
    );

    if (remainingCooldown > 0) {
      return NextResponse.json(
        {
          error: `인증번호는 ${remainingCooldown}초 후 다시 요청할 수 있습니다.`,
          retryAfter: remainingCooldown,
        },
        {
          status: 429,
        }
      );
    }

    /*
      가입되지 않은 전화번호는 실제 SMS를 발송하지 않습니다.

      send-code에서 가입되지 않은 번호는
      vonage_request_id가 null로 저장되므로,
      이 경우에도 실제 Vonage 요청을 보내지 않고
      DB의 상태만 갱신합니다.
    */
    if (!verificationRequest.vonage_request_id) {
      const now = new Date();

      const expiresAt = new Date(
        now.getTime() +
          OTP_EXPIRES_IN_SECONDS * 1000
      );

      const newResendCount =
        verificationRequest.resend_count + 1;

      const {
        error: updateError,
      } = await supabaseAdmin
        .from("phone_verification_requests")
        .update({
          expires_at:
            expiresAt.toISOString(),

          last_sent_at:
            now.toISOString(),

          resend_count:
            newResendCount,

          failed_attempts: 0,
        })
        .eq("id", verificationId)
        .is("verified_at", null);

      if (updateError) {
        console.error(
          "재전송 인증 요청 DB 업데이트 오류:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "인증번호 재전송 중 오류가 발생했습니다.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        expiresIn: OTP_EXPIRES_IN_SECONDS,
        resendAvailableIn:
          RESEND_COOLDOWN_SECONDS,
        resendCount: newResendCount,
        remainingResends:
          MAX_RESEND_COUNT - newResendCount,
      });
    }

    /*
      Vonage 환경 변수 확인
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
          error: "인증번호 재전송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    const credentials = Buffer.from(
      `${apiKey}:${apiSecret}`
    ).toString("base64");

    /*
      기존 Vonage 인증 요청이 있다면 먼저 취소합니다.

      같은 전화번호에 진행 중인 Verify 요청이 있으면
      Vonage에서 새로운 요청을 거부할 수 있기 때문입니다.
    */
    try {
      const cancelResponse = await fetch(
        `https://api.nexmo.com/v2/verify/${verificationRequest.vonage_request_id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (!cancelResponse.ok) {
        const cancelData =
          await cancelResponse.json().catch(() => null);

        console.warn(
          "기존 Vonage 인증 요청 취소 실패:",
          cancelData
        );
      }
    } catch (error) {
      console.warn(
        "기존 Vonage 인증 요청 취소 중 오류:",
        error
      );
    }

    const now = new Date();

    const expiresAt = new Date(
      now.getTime() +
        OTP_EXPIRES_IN_SECONDS * 1000
    );

    /*
      새로운 인증번호를 발송합니다.
    */
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
              to: verificationRequest.phone,
            },
          ],
        }),
      }
    );

    const vonageData = await vonageResponse.json();

    if (!vonageResponse.ok) {
      console.error(
        "Vonage 인증번호 재전송 오류:",
        vonageData
      );

      return NextResponse.json(
        {
          error:
            "인증번호 재전송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

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
          error:
            "인증번호 재전송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      같은 verificationId를 유지하면서
      새로운 Vonage request_id와 시간을 저장합니다.
    */
    const newResendCount =
      verificationRequest.resend_count + 1;

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("phone_verification_requests")
      .update({
        vonage_request_id:
          vonageData.request_id,

        expires_at:
          expiresAt.toISOString(),

        last_sent_at:
          now.toISOString(),

        resend_count:
          newResendCount,

        failed_attempts: 0,
      })
      .eq("id", verificationId)
      .is("verified_at", null);

    if (updateError) {
      console.error(
        "재전송 인증 요청 DB 업데이트 오류:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "인증번호 재전송 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      expiresIn: OTP_EXPIRES_IN_SECONDS,
      resendAvailableIn:
        RESEND_COOLDOWN_SECONDS,
      resendCount: newResendCount,
      remainingResends:
        MAX_RESEND_COUNT - newResendCount,
    });
  } catch (error) {
    console.error(
      "휴대폰 인증번호 재전송 API 오류:",
      error
    );

    return NextResponse.json(
      {
        error:
          "인증번호 재전송 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}