import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | Bún Đậu Chú Béo",
  description: "Đăng nhập hệ thống quản trị nội bộ Bún Đậu Chú Béo",
};

export default function SignIn() {
  return <SignInForm />;
}
