"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { storageService } from "@/services/storage/service";
import { useEditor } from "@/editor/use-editor";

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
	const { user, isLoaded } = useUser();
	const editor = useEditor();
	const prevUserIdRef = useRef<string | null | undefined>(undefined);

	useEffect(() => {
		if (!isLoaded) return;

		const currentUserId = user?.id ?? null;

		// Only re-scope when the user ID actually transitions
		if (prevUserIdRef.current !== currentUserId) {
			prevUserIdRef.current = currentUserId;
			storageService.setUserScope({ userId: currentUserId });
			void editor.project.reloadUserProjects();
		}
	}, [isLoaded, user?.id, editor.project]);

	return <>{children}</>;
}
