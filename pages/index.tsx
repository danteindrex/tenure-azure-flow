import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookieHeader = req.headers.cookie || "";
  const isAuthed = /(^|;\s*)auth_token=/.test(cookieHeader);
  return {
    redirect: {
      destination: isAuthed ? "/dashboard" : "/login",
      permanent: false,
    },
  };
};

export default function HomeRedirect() {
  return null;
}