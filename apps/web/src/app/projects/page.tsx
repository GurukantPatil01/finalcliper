"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { UserAuthButton } from "@/components/auth/user-auth-button";
import { ApiKeysButton } from "@/components/settings/api-keys-modal";
import { toast } from "sonner";
import type { EditorCore } from "@/core";
import { MigrationDialog } from "@/project/components/migration-dialog";
import { StoragePersistenceDialog } from "@/services/storage/components/storage-persistence-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditor } from "@/editor/use-editor";
import { useProjectsStore } from "./store";
import type {
	TProjectMetadata,
	TProjectSortKey,
	TProjectSortOption,
} from "@/project/types";
import { formatTimecode, mediaTimeToSeconds } from "opencut-wasm";
import { formatDate } from "@/utils/date";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {

	GridViewIcon,
	LeftToRightListDashIcon,
	PlusSignIcon,
	Search01Icon,
	MoreHorizontalIcon,
	Delete02Icon,
	Copy01Icon,
	Edit03Icon,
	ArrowDown02Icon,
	InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { OcVideoIcon } from "@/components/icons";
import { Label } from "@/components/ui/label";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteProjectDialog } from "@/project/components/delete-project-dialog";
import { ProjectInfoDialog } from "@/project/components/project-info-dialog";
import { RenameProjectDialog } from "@/project/components/rename-project-dialog";
import { cn } from "@/utils/ui";
import { ChangelogNotification } from "@/changelog/components/changelog-notification";
const formatProjectDuration = ({
	duration,
}: {
	duration: number | undefined;
}): string | null => {
	if (duration === undefined) {
		return null;
	}

	const durationSeconds = mediaTimeToSeconds({ time: duration });
	const format = durationSeconds >= 3600 ? "HH:MM:SS" : "MM:SS";
	return formatTimecode({ time: duration, format }) ?? "";
};

const VIEW_MODE_OPTIONS = [
	{ mode: "grid" as const, icon: GridViewIcon, label: "Grid view" },
	{ mode: "list" as const, icon: LeftToRightListDashIcon, label: "List view" },
];

export default function ProjectsPage() {
	const { searchQuery, sortKey, sortOrder, viewMode } = useProjectsStore();
	const editor = useEditor();
	const sortOption: TProjectSortOption = `${sortKey}-${sortOrder}`;

	const isLoading = useEditor((e) => e.project.getIsLoading());
	const isInitialized = useEditor((e) => e.project.getIsInitialized());
	const projectsToDisplay = useEditor((e) =>
		e.project.getFilteredAndSortedProjects({ searchQuery, sortOption }),
	);

	useEffect(() => {
		if (!editor.project.getIsInitialized()) {
			editor.project.loadAllProjects();
		}
	}, [editor.project]);

	return (
		<div className="bg-background min-h-screen">
			<MigrationDialog />
			<StoragePersistenceDialog />
			<ChangelogNotification />
			<ProjectsHeader />
			<ProjectsToolbar projectIds={projectsToDisplay.map((p) => p.id)} />
			<main className="mx-auto max-w-[88rem] px-6 pt-2 pb-10 lg:px-10">
				{isLoading || !isInitialized ? (
					<ProjectsSkeleton />
				) : projectsToDisplay.length === 0 ? (
					<EmptyState />
				) : (
					<div
						className={
							viewMode === "grid"
								? "xs:grid-cols-2 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
								: "flex flex-col border-t border-border"
						}
					>
						{projectsToDisplay.map((project) => (
							<ProjectItem
								key={project.id}
								project={project}
								allProjectIds={projectsToDisplay.map((p) => p.id)}
							/>
						))}
					</div>
				)}
			</main>
		</div>
	);
}

function ProjectsHeader() {
	const { viewMode, isHydrated, setViewMode } = useProjectsStore();

	return (
		<header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
			<div className="mx-auto flex max-w-[88rem] items-center justify-between px-6 pt-4 lg:px-10">
				<div className="flex items-baseline gap-5">
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink asChild>
									<Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
										Home
									</Link>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage className="text-sm font-medium">All projects</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="hidden items-center rounded-sm border border-border md:flex">
						{VIEW_MODE_OPTIONS.map(({ mode, icon, label }, i) => (
							<Button
								key={mode}
								variant="ghost"
								size="icon"
								className={cn(
									"h-8 w-8 rounded-none hover:bg-accent",
									i === 0 && "border-r border-border",
									isHydrated && viewMode === mode && "!bg-foreground !text-background hover:!bg-foreground",
								)}
								onClick={() => setViewMode({ viewMode: mode })}
								aria-label={label}
								aria-pressed={isHydrated && viewMode === mode}
							>
								<HugeiconsIcon icon={icon} className="size-4" />
							</Button>
						))}
					</div>
				</div>

				<div className="flex items-center gap-3 md:gap-4">
					<SearchBar className="hidden w-56 md:block" />
					<ApiKeysButton className="h-9 rounded-sm border border-border bg-transparent text-xs px-3 shadow-none hover:bg-accent" />
					<NewProjectButton />
					<UserAuthButton variant="outline" size="default" className="h-9 rounded-sm text-xs px-3" />
				</div>
			</div>
			<div className="mx-auto max-w-[88rem] px-6 md:hidden">
				<SearchBar className="mt-3 mb-1" />
			</div>
		</header>
	);
}

const SORT_LABELS: Record<TProjectSortKey, string> = {
	createdAt: "Created",
	updatedAt: "Modified",
	name: "Name",
	duration: "Duration",
};

function ProjectsToolbar({ projectIds }: { projectIds: string[] }) {
	const {
		selectedProjectIds,
		sortKey,
		sortOrder,
		setSortOrder,
		setSelectedProjects,
		clearSelectedProjects,
		viewMode,
		setViewMode,
	} = useProjectsStore();

	const selectedProjectCount = selectedProjectIds.length;
	const isAllSelected =
		projectIds.length > 0 && selectedProjectCount === projectIds.length;
	const hasSomeSelected =
		selectedProjectCount > 0 && selectedProjectCount < projectIds.length;

	const handleSelectAll = ({ checked }: { checked: boolean }) => {
		if (checked) {
			setSelectedProjects({ projectIds });
			return;
		}
		clearSelectedProjects();
	};

	return (
		<div className="sticky top-16 z-10 mx-auto flex h-12 max-w-[88rem] items-center justify-between border-b border-border px-6 lg:px-10">
			<div className="flex items-center gap-2">
				<Label
					className="flex cursor-pointer items-center gap-3 px-2"
					htmlFor="select-all-projects"
				>
					<Checkbox
						className="size-4 rounded-sm border-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary"
						id="select-all-projects"
						checked={
							isAllSelected ? true : hasSomeSelected ? "indeterminate" : false
						}
						onCheckedChange={(checked) =>
							handleSelectAll({ checked: checked === true })
						}
					/>
					<span className="text-muted-foreground hidden md:block">
						Select all
					</span>
				</Label>

				<div className="h-4 w-px bg-border/50" />

				<SortDropdown>
					<Button variant="text" className="text-muted-foreground pl-2">
						{SORT_LABELS[sortKey]}
					</Button>
				</SortDropdown>
				<Button
					variant="text"
					className="text-muted-foreground"
					onClick={() =>
						setSortOrder({
							sortOrder: sortOrder === "asc" ? "desc" : "asc",
						})
					}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							setSortOrder({
								sortOrder: sortOrder === "asc" ? "desc" : "asc",
							});
						}
					}}
					aria-label={`Sort ${sortOrder === "asc" ? "ascending" : "descending"}`}
				>
					<HugeiconsIcon
						icon={ArrowDown02Icon}
						className={sortOrder === "asc" ? "rotate-180" : ""}
					/>
				</Button>

				<div className="h-4 w-px bg-border/50 block md:hidden" />

				<div className="flex md:hidden items-center gap-4">
					{VIEW_MODE_OPTIONS.map(({ mode, icon, label }) => (
						<Button
							key={mode}
							variant="text"
							onClick={() => setViewMode({ viewMode: mode })}
							aria-label={label}
						>
							<HugeiconsIcon
								icon={icon}
								className={cn(
									viewMode === mode ? "text-primary" : "text-muted-foreground",
								)}
							/>
						</Button>
					))}
				</div>
			</div>
			{selectedProjectCount > 0 ? <ProjectActions /> : null}
		</div>
	);
}

function SearchBar({
	className,
	collapsed,
}: {
	className?: string;
	collapsed?: boolean;
}) {
	const { searchQuery, setSearchQuery } = useProjectsStore();

	return (
		<>
			{collapsed ? (
				<div className="block md:hidden">
					<Button
						size="icon"
						variant="outline"
						className="size-10.5 rounded-full"
					>
						<HugeiconsIcon icon={Search01Icon} />
					</Button>
				</div>
			) : (
				<div className={cn("relative", className)}>
					<HugeiconsIcon
						icon={Search01Icon}
						className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
						aria-hidden="true"
					/>
					<Input
						placeholder="Search..."
						value={searchQuery}
						onChange={(event) => setSearchQuery({ query: event.target.value })}
						size="lg"
						className="pl-9"
					/>
				</div>
			)}
		</>
	);
}

const PROJECT_ACTIONS = [
	{
		id: "duplicate",
		label: "Duplicate",
		icon: Copy01Icon,
		variant: "outline" as const,
	},
	{
		id: "delete",
		label: "Delete",
		icon: Delete02Icon,
		variant: "destructive-foreground" as const,
	},
] as const;

async function deleteProjects({
	editor,
	ids,
}: {
	editor: EditorCore;
	ids: string[];
}) {
	await editor.project.deleteProjects({ ids });
}

async function duplicateProjects({
	editor,
	ids,
}: {
	editor: EditorCore;
	ids: string[];
}) {
	await editor.project.duplicateProjects({ ids });
}

async function renameProject({
	editor,
	id,
	name,
}: {
	editor: EditorCore;
	id: string;
	name: string;
}) {
	await editor.project.renameProject({ id, name });
}

function ProjectActions() {
	const editor = useEditor();
	const { selectedProjectIds, clearSelectedProjects } = useProjectsStore();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const savedProjects = editor.project.getSavedProjects();
	const selectedProjectNames = savedProjects
		.filter((project) => selectedProjectIds.includes(project.id))
		.map((project) => project.name);

	const handleDuplicate = async () => {
		await duplicateProjects({ editor, ids: selectedProjectIds });
		clearSelectedProjects();
	};

	const handleDeleteClick = () => {
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		await deleteProjects({ editor, ids: selectedProjectIds });
		clearSelectedProjects();
		setIsDeleteDialogOpen(false);
	};

	const actionHandlers: Record<string, () => void> = {
		duplicate: handleDuplicate,
		delete: handleDeleteClick,
	};

	return (
		<>
			<div className="flex items-center gap-2.5 px-3">
				<div className="hidden sm:flex items-center gap-2.5">
					{PROJECT_ACTIONS.map((action) => (
						<Button
							key={action.id}
							size="icon"
							variant={action.variant}
							className="size-9"
							onClick={actionHandlers[action.id]}
						>
							<HugeiconsIcon icon={action.icon} />
						</Button>
					))}
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild className="sm:hidden">
						<Button size="icon" variant="outline" className="size-9">
							<HugeiconsIcon icon={MoreHorizontalIcon} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{PROJECT_ACTIONS.map((action) => (
							<DropdownMenuItem
								key={action.id}
								variant={action.id === "delete" ? "destructive" : undefined}
								onClick={actionHandlers[action.id]}
							>
								<HugeiconsIcon icon={action.icon} />
								{action.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={selectedProjectNames}
				onConfirm={handleDeleteConfirm}
			/>
		</>
	);
}

function SortDropdown({ children }: { children: React.ReactNode }) {
	const { sortKey, setSortKey } = useProjectsStore();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent className="w-48" align="center">
				<DropdownMenuCheckboxItem
					checked={sortKey === "createdAt"}
					onCheckedChange={() => setSortKey({ sortKey: "createdAt" })}
				>
					Created
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "updatedAt"}
					onCheckedChange={() => setSortKey({ sortKey: "updatedAt" })}
				>
					Modified
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "name"}
					onCheckedChange={() => setSortKey({ sortKey: "name" })}
				>
					Name
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "duration"}
					onCheckedChange={() => setSortKey({ sortKey: "duration" })}
				>
					Duration
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NewProjectButton() {
	const editor = useEditor();
	const router = useRouter();

	const handleCreateProject = async () => {
		const projectId = await editor.project.createNewProject({
			name: "New project",
		});
		router.push(`/editor/${projectId}`);
	};

	return (
		<Button
			size="lg"
			className="rounded-sm px-5 md:px-6 font-medium"
			onClick={handleCreateProject}
		>
			<span className="text-sm font-medium hidden md:block">New project</span>
			<span className="text-sm font-medium block md:hidden">New</span>
		</Button>
	);
}

function ProjectItem({
	project,
	allProjectIds,
}: {
	project: TProjectMetadata;
	allProjectIds: string[];
}) {
	const {
		selectedProjectIds,
		viewMode,
		setProjectSelected,
		selectProjectRange,
	} = useProjectsStore();
	const selectedProjectIdSet = new Set(selectedProjectIds);
	const isSelected = selectedProjectIdSet.has(project.id);
	const selectedProjectCount = selectedProjectIds.length;
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
	const editor = useEditor();
	const durationLabel = formatProjectDuration({ duration: project.duration });
	const isMultiSelect = selectedProjectCount > 1;
	const isGridView = viewMode === "grid";

	const handleRename = () => setIsRenameDialogOpen(true);
	const handleDuplicate = async () => {
		await duplicateProjects({ editor, ids: [project.id] });
	};
	const handleDeleteClick = () => setIsDeleteDialogOpen(true);
	const handleInfoClick = () => setIsInfoDialogOpen(true);
	const handleDeleteConfirm = async () => {
		await deleteProjects({ editor, ids: [project.id] });
		setIsDeleteDialogOpen(false);
	};

	const handleCheckboxChange = ({
		checked,
		shiftKey,
	}: {
		checked: boolean;
		shiftKey: boolean;
	}) => {
		if (shiftKey && checked) {
			selectProjectRange({ projectId: project.id, allProjectIds });
			return;
		}
		setProjectSelected({ projectId: project.id, isSelected: checked });
	};

	const gridContent = (
		<Card className="overflow-hidden border border-border bg-card p-0 shadow-none transition-colors group-hover:border-foreground/30">
			<div className="relative aspect-video bg-muted">
				<div className="absolute inset-0">
					{project.thumbnail ? (
						<Image
							src={project.thumbnail}
							alt="Project thumbnail"
							fill
							className="object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center">
							<OcVideoIcon className="text-muted-foreground size-10 shrink-0" />
						</div>
					)}
				</div>

				{durationLabel && (
					<div className="tabular absolute bottom-2 right-2 rounded-[2px] bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
						{durationLabel}
					</div>
				)}
			</div>

			<CardContent className="flex flex-col gap-1.5 px-4 pt-3 pb-4">
				<h3 className="line-clamp-2 text-sm leading-snug font-medium tracking-tight text-card-foreground">
					{project.name}
				</h3>
				<div className="editorial-label flex items-center gap-1.5 text-muted-foreground normal-case tracking-normal">
					<span>Created {formatDate({ date: project.createdAt })}</span>
				</div>
			</CardContent>
		</Card>
	);

	const listRowContent = (
		<div className="flex items-center gap-3 flex-1 min-w-0">
			<div className="relative size-10 shrink-0 overflow-hidden rounded-[2px] border border-border bg-muted">
				{project.thumbnail ? (
					<Image
						src={project.thumbnail}
						alt="Project thumbnail"
						fill
						className="object-cover"
					/>
				) : (
					<div className="flex size-full items-center justify-center">
						<OcVideoIcon className="text-muted-foreground size-5 shrink-0" />
					</div>
				)}
			</div>

			<h3 className="group-hover:text-foreground/90 text-sm font-medium truncate flex-1 min-w-0">
				{project.name}
			</h3>

			<span className="tabular text-muted-foreground shrink-0 text-sm hidden sm:block">
				{durationLabel ?? "—"}
			</span>

			<span className="text-muted-foreground text-sm shrink-0 w-auto pl-8 text-right hidden xs:block">
				{formatDate({ date: project.createdAt })}
			</span>
		</div>
	);

	const listContent = (
		<div
			className={`flex items-center gap-4 border-b border-border px-4 py-2.5 ${
				isSelected ? "bg-accent shadow-[inset_2px_0_0_var(--primary)]" : ""
			}} hover:bg-accent/60`}
		>
			<Checkbox
				checked={isSelected}
				onMouseDown={(event) => event.preventDefault()}
				onClick={(event) => {
					handleCheckboxChange({
						checked: !isSelected,
						shiftKey: event.shiftKey,
					});
				}}
				onCheckedChange={() => {}}
				className="size-5 shrink-0"
			/>

			<Link href={`/editor/${project.id}`} className="flex-1 min-w-0">
				{listRowContent}
			</Link>

			{!isMultiSelect && (
				<ProjectMenu
					isOpen={isDropdownOpen}
					onOpenChange={setIsDropdownOpen}
					variant="list"
					onRenameClick={handleRename}
					onDuplicateClick={handleDuplicate}
					onDeleteClick={handleDeleteClick}
					onInfoClick={handleInfoClick}
				/>
			)}
		</div>
	);

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div className="group relative">
						{isGridView ? (
							<>
								<Link href={`/editor/${project.id}`} className="block">
									{gridContent}
								</Link>

								<Checkbox
									checked={isSelected}
									onMouseDown={(event) => event.preventDefault()}
									onClick={(event) => {
										handleCheckboxChange({
											checked: !isSelected,
											shiftKey: event.shiftKey,
										});
									}}
									onCheckedChange={() => {}}
									className={`absolute z-10 size-4 rounded-sm top-3 left-3 ${
										isSelected || isDropdownOpen
											? "opacity-100"
											: "opacity-0 group-hover:opacity-100"
									}`}
								/>

								{!isMultiSelect && (
									<ProjectMenu
										isOpen={isDropdownOpen}
										onOpenChange={setIsDropdownOpen}
										onRenameClick={handleRename}
										onDuplicateClick={handleDuplicate}
										onDeleteClick={handleDeleteClick}
										onInfoClick={handleInfoClick}
									/>
								)}
							</>
						) : (
							listContent
						)}
					</div>
				</ContextMenuTrigger>
				<ProjectContextMenuContent
					onRenameClick={handleRename}
					onDuplicateClick={handleDuplicate}
					onDeleteClick={handleDeleteClick}
					onInfoClick={handleInfoClick}
				/>
			</ContextMenu>

			<RenameProjectDialog
				isOpen={isRenameDialogOpen}
				onOpenChange={setIsRenameDialogOpen}
				projectName={project.name}
				onConfirm={async (newName) => {
					await renameProject({ editor, id: project.id, name: newName });
					setIsRenameDialogOpen(false);
				}}
			/>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={[project.name]}
				onConfirm={handleDeleteConfirm}
			/>

			<ProjectInfoDialog
				isOpen={isInfoDialogOpen}
				onOpenChange={setIsInfoDialogOpen}
				project={project}
			/>
		</>
	);
}

function ProjectContextMenuContent({
	onRenameClick,
	onDuplicateClick,
	onDeleteClick,
	onInfoClick,
}: {
	onRenameClick: () => void;
	onDuplicateClick: () => void;
	onDeleteClick: () => void;
	onInfoClick: () => void;
}) {
	return (
		<ContextMenuContent>
			<ContextMenuItem
				icon={<HugeiconsIcon icon={Edit03Icon} />}
				onClick={onRenameClick}
			>
				Rename
			</ContextMenuItem>
			<ContextMenuItem
				icon={<HugeiconsIcon icon={Copy01Icon} />}
				onClick={onDuplicateClick}
			>
				Duplicate
			</ContextMenuItem>
			<ContextMenuItem
				icon={<HugeiconsIcon icon={InformationCircleIcon} />}
				onClick={onInfoClick}
			>
				Info
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem
				variant="destructive"
				icon={<HugeiconsIcon icon={Delete02Icon} />}
				onClick={onDeleteClick}
			>
				Delete
			</ContextMenuItem>
		</ContextMenuContent>
	);
}

function ProjectMenu({
	isOpen,
	onOpenChange,
	variant = "grid",
	onRenameClick,
	onDuplicateClick,
	onDeleteClick,
	onInfoClick,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	variant?: "grid" | "list";
	onRenameClick: () => void;
	onDuplicateClick: () => void;
	onDeleteClick: () => void;
	onInfoClick: () => void;
}) {
	const handleMenuClick = ({
		event,
	}: {
		event: MouseEvent<HTMLButtonElement>;
	}) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const handleMenuKeyDown = ({
		event,
	}: {
		event: KeyboardEvent<HTMLButtonElement>;
	}) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
	};

	const handleRename = () => {
		onRenameClick();
		onOpenChange(false);
	};

	const handleDuplicate = () => {
		onDuplicateClick();
		onOpenChange(false);
	};

	const handleDeleteClick = () => {
		onDeleteClick();
		onOpenChange(false);
	};

	const handleInfoClick = () => {
		onInfoClick();
		onOpenChange(false);
	};

	const isGrid = variant === "grid";

	return (
		<DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="background"
					className={
						isGrid
							? `absolute z-10 top-3 right-3 ${isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`
							: "!bg-transparent !shadow-none"
					}
					size="icon"
					aria-label="Project menu"
					onClick={(event) =>
						handleMenuClick({
							event: event as unknown as MouseEvent<HTMLButtonElement>,
						})
					}
					onMouseDown={(event) => event.stopPropagation()}
					onKeyDown={(event) =>
						handleMenuKeyDown({
							event: event as unknown as KeyboardEvent<HTMLButtonElement>,
						})
					}
				>
					<HugeiconsIcon
						icon={MoreHorizontalIcon}
						className="text-foreground"
						aria-hidden="true"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-48" align="end">
				<DropdownMenuItem onClick={handleRename}>
					<HugeiconsIcon icon={Edit03Icon} />
					Rename
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleDuplicate}>
					<HugeiconsIcon icon={Copy01Icon} />
					Duplicate
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleInfoClick}>
					<HugeiconsIcon icon={InformationCircleIcon} />
					Info
				</DropdownMenuItem>
				<DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
					<HugeiconsIcon icon={Delete02Icon} />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ProjectsSkeleton() {
	const skeletonIds = Array.from(
		{ length: 24 },
		(_, index) => `skeleton-${index}`,
	);

	return (
		<div className="px-4 xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
			{skeletonIds.map((skeletonId) => (
				<Card
					key={skeletonId}
					className="bg-background overflow-hidden border-none p-0"
				>
					<div className="bg-muted relative aspect-video">
						<div className="absolute inset-0">
							<Skeleton className="bg-muted/50 size-full" />
						</div>
					</div>
					<CardContent className="flex flex-col gap-2 px-0 pt-4">
						<Skeleton className="bg-muted/50 h-4 w-3/4" />
						<div className="text-muted-foreground flex items-center gap-1.5">
							<Skeleton className="bg-muted/50 size-4" />
							<Skeleton className="bg-muted/50 h-4 w-24" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function EmptyState() {
	const { searchQuery, setSearchQuery } = useProjectsStore();
	const router = useRouter();
	const editor = useEditor();
	const savedProjects = editor.project.getSavedProjects();

	const handleCreateProject = async () => {
		try {
			const projectId = await editor.project.createNewProject({
				name: "New project",
			});
			router.push(`/editor/${projectId}`);
		} catch (error) {
			toast.error("Failed to create project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		}
	};

	if (savedProjects.length > 0) {
		return (
<div className="mx-auto mt-8 flex max-w-md flex-col items-center border border-border bg-card px-8 py-14 text-center">
				<p className="editorial-label text-muted-foreground">Search</p>
				<h3 className="mt-3 text-xl font-semibold tracking-tight">No results found</h3>
				<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
					Your search for "{searchQuery}" did not return any projects.
				</p>
				<Button
					onClick={() => setSearchQuery({ query: "" })}
					variant="outline"
					className="mt-6 rounded-sm"
				>
					Clear search
				</Button>
			</div>
		);
	}

	return (
<div className="mx-auto mt-8 flex max-w-lg flex-col items-center border border-border bg-card px-8 py-16 text-center">
				<p className="editorial-label text-muted-foreground">Projects</p>
				<h3 className="mt-3 text-2xl font-semibold tracking-tight">Nothing on the shelf yet</h3>
				<p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
					Create your first project to import media, cut on the timeline and export —
					all stored privately on this device.
				</p>
				<Button size="lg" className="mt-7 gap-2 rounded-sm px-7 font-medium" onClick={handleCreateProject}>
					<HugeiconsIcon icon={PlusSignIcon} />
					Create your first project
				</Button>
			</div>
	);
}
