import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/src/lib/supabase-admin";

const MAX_FAILED_ATTEMPTS = 3;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const verificationId = body.verificationId?.trim();
    const code = body.code?.trim();

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

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error: "6자리 인증번호를 입력해 주세요.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      브라우저가 phone, purpose, Vonage request_id를
      직접 보내지 않도록 하고,
      verificationId를 기준으로 서버 DB에서 조회합니다.
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
          failed_attempts
        `
      )
      .eq("id", verificationId)
      .maybeSingle();

    if (verificationRequestError) {
      console.error(
        "인증 요청 조회 오류:",
        verificationRequestError
      );

      return NextResponse.json(
        {
          error: "인증번호 확인 중 오류가 발생했습니다.",
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
            "인증번호가 올바르지 않거나 인증 요청이 만료되었습니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      현재는 계정 찾기 인증 요청만 허용합니다.
      purpose는 브라우저 값이 아니라 DB 값을 검사합니다.
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
      이미 성공한 인증 요청은 다시 사용할 수 없습니다.
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
      인증번호를 너무 많이 틀린 경우 차단합니다.
    */
    if (
      verificationRequest.failed_attempts >=
      MAX_FAILED_ATTEMPTS
    ) {
      return NextResponse.json(
        {
          error:
            "인증번호 입력 횟수를 초과했습니다. 인증번호를 다시 요청해 주세요.",
        },
        {
          status: 429,
        }
      );
    }

    /*
      서버 DB에 저장한 만료 시간을 확인합니다.
    */
    const expiresAt = new Date(
      verificationRequest.expires_at
    );

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "인증번호가 만료되었습니다. 인증번호를 다시 요청해 주세요.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      가입되어 있지 않은 전화번호의 경우
      실제 Vonage request_id를 저장하지 않았기 때문에
      인증이 성공할 수 없습니다.
    */
    if (!verificationRequest.vonage_request_id) {
      return NextResponse.json(
        {
          error:
            "인증번호가 올바르지 않거나 인증 요청이 만료되었습니다.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error(
        "Vonage API 환경 변수가 설정되지 않았습니다."
      );

      return NextResponse.json(
        {
          error: "인증번호 확인 중 오류가 발생했습니다.",
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
      DB에 저장된 Vonage request_id를 사용하여
      사용자가 입력한 인증번호를 검증합니다.
    */
    const vonageResponse = await fetch(
      `https://api.nexmo.com/v2/verify/${verificationRequest.vonage_request_id}`,
      {
        method: "POST",

        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          code,
        }),
      }
    );

    const vonageData = await vonageResponse.json();

    /*
      인증번호가 틀렸거나 Vonage에서 인증에 실패한 경우
      failed_attempts를 1 증가시킵니다.
    */
    if (
      !vonageResponse.ok ||
      vonageData.status !== "completed"
    ) {
      const { error: failedAttemptError } =
        await supabaseAdmin
          .from("phone_verification_requests")
          .update({
            failed_attempts:
              verificationRequest.failed_attempts + 1,
          })
          .eq("id", verificationId);

      if (failedAttemptError) {
        console.error(
          "인증 실패 횟수 저장 오류:",
          failedAttemptError
        );
      }

      console.error(
        "Vonage 인증번호 검증 실패:",
        vonageData
      );

      return NextResponse.json(
        {
          error:
            "인증번호가 올바르지 않거나 만료되었습니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      인증 성공 시간을 DB에 기록합니다.
      이후 같은 verificationId를 다시 사용하는 것을 막습니다.
    */
    const verifiedAt = new Date().toISOString();

    const { error: verifiedUpdateError } =
      await supabaseAdmin
        .from("phone_verification_requests")
        .update({
          verified_at: verifiedAt,
        })
        .eq("id", verificationId)
        .is("verified_at", null);

    if (verifiedUpdateError) {
      console.error(
        "인증 완료 상태 저장 오류:",
        verifiedUpdateError
      );

      return NextResponse.json(
        {
          error: "인증 처리 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      인증이 성공했으므로
      DB에 저장된 전화번호를 이용해 계정을 조회합니다.
    */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("phone", verificationRequest.phone)
        .maybeSingle();

    if (profileError) {
      console.error(
        "계정 이메일 조회 오류:",
        profileError
      );

      return NextResponse.json(
        {
          error: "계정 정보 조회 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    if (!profile?.email) {
      return NextResponse.json(
        {
          error: "계정 정보를 확인할 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      인증 성공과 계정 이메일 조회까지 완료했으므로
      더 이상 사용할 필요가 없는 인증 요청 데이터를 삭제합니다.
    */
    const { error: deleteError } =
      await supabaseAdmin
        .from("phone_verification_requests")
        .delete()
        .eq("id", verificationId);

    if (deleteError) {
      console.error(
        "인증 요청 삭제 오류:",
        deleteError
      );

      return NextResponse.json(
        {
          error: "인증 처리 중 오류가 발생했습니다.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      휴대폰 인증을 성공한 사용자에게
      계정 이메일 전체를 반환합니다.
    */
    return NextResponse.json({
      success: true,
      email: profile.email,
    });
  } catch (error) {
    console.error(
      "휴대폰 인증번호 확인 API 오류:",
      error
    );

    return NextResponse.json(
      {
        error: "인증번호 확인 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}