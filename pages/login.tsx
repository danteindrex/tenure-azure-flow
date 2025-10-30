import Head from "next/head";
import Login from "../src/pages/Login";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login | Home Solutions</title>
        <meta name="description" content="Sign in to your Home Solutions dashboard." />
      </Head>
      <Login />
    </>
  );
}