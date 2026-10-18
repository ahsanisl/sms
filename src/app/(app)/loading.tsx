import { PageLoader } from "@/components/shared/page-loader";

// Shown inside the app shell (sidebar + topbar stay put) whenever a page in
// this route group is loading its data on the server — every page here
// fetches through the services layer, so this covers all of them. Next.js
// prefetches this fallback, so it appears the moment a link is clicked.
export default function AppLoading() {
  return <PageLoader />;
}
