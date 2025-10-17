import Head from "next/head";
import Login from "../src/pages/Login";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login | Tenure</title>
        <meta name="description" content="Sign in to your Tenure dashboard." />
      </Head>
      <Login />
    </>
  );
}