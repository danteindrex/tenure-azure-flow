import Head from "next/head";
import CompleteProfile from "../../src/pages/CompleteProfile";

export default function CompleteProfilePage() {
  return (
    <>
      <Head>
        <title>Complete Profile | Tenure</title>
        <meta name="description" content="Complete your profile to continue with Tenure membership." />
      </Head>
      <CompleteProfile />
    </>
  );
}