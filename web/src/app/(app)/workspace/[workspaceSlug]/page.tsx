import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function WorkspacePage({ params }: Props) {
  const { workspaceSlug } = await params;
  redirect(`/workspace/${workspaceSlug}/plan`);
}
