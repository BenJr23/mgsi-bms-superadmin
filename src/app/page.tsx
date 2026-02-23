import { Suspense } from "react";
import SignInPage from "./sign-in/page";

export default function Page() {
	return (
		<Suspense fallback={null}>
			<SignInPage />
		</Suspense>
	);
}
