import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<SignUp
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
