import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<SignIn
				appearance={{
					elements: {
						rootBox: "mx-auto w-full max-w-md shadow-xl rounded-2xl",
						card: "bg-background border rounded-2xl",
					},
				}}
			/>
		</div>
	);
}
