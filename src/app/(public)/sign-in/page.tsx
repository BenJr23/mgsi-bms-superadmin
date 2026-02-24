import { Suspense } from "react";
import SignInPageClient from "@/app/sign-in/SignInPageClient";

export default function SignInPage() {
    return (
        <Suspense fallback={null}>
            <SignInPageClient />
        </Suspense>
    );
}
