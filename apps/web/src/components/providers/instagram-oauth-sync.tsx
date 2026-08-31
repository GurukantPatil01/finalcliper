"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
	getInstagramConnection,
	saveInstagramConnection,
	pickupInstagramOAuthHandoff,
} from "@/services/instagram/connection";

function InstagramOAuthSyncInner() {
	const searchParams = useSearchParams();

	useEffect(() => {
		const connect = searchParams.get("connect");
		const username = searchParams.get("username");
		const message = searchParams.get("message");

		if (connect === "success") {
			void pickupInstagramOAuthHandoff().then((conn) => {
				const finalConn = conn || getInstagramConnection();
				if (username && finalConn && (!finalConn.username || finalConn.username !== username)) {
					saveInstagramConnection({ ...finalConn, username });
				}
				toast.success(
					username
						? `Instagram connected as @${username}`
						: "Instagram connected successfully!",
				);
			});
			// Clean up URL parameters cleanly
			if (typeof window !== "undefined") {
				const url = new URL(window.location.href);
				url.searchParams.delete("connect");
				url.searchParams.delete("username");
				url.searchParams.delete("message");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
			}
		} else if (connect === "error") {
			toast.error(message || "Instagram connection failed");
			if (typeof window !== "undefined") {
				const url = new URL(window.location.href);
				url.searchParams.delete("connect");
				url.searchParams.delete("message");
				window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
			}
		} else {
			// On normal mount without connect param, check if there's any pending handoff
			void pickupInstagramOAuthHandoff();
		}
	}, [searchParams]);

	return null;
}

export function InstagramOAuthSync() {
	return (
		<Suspense fallback={null}>
			<InstagramOAuthSyncInner />
		</Suspense>
	);
}
