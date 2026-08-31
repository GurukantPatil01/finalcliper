"use client";

import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

interface UserAuthButtonProps {
	variant?: "outline" | "ghost" | "default";
	size?: "sm" | "default" | "lg";
	className?: string;
}

export function UserAuthButton({
	variant = "ghost",
	size = "sm",
	className = "h-8 text-xs font-medium px-2.5",
}: UserAuthButtonProps) {
	const { isSignedIn, isLoaded } = useUser();

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
		return (
			<div className="flex items-center">
				<UserButton />
			</div>
		);
	}

	return (
		<SignInButton mode="modal">
			<Button variant={variant} size={size} className={className}>
				Sign In
			</Button>
		</SignInButton>
	);
}
