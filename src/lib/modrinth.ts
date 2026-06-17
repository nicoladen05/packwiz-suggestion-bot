const USER_AGENT = "nicoladen05/packwiz-suggestion-bot";

export type ModrinthProject = {
  project_id: string;
  project_type: "mod" | "modpack" | "resourcepack" | "shader";
  slug?: string;
  author: string;
  title?: string;
  description?: string;
  categories?: string[];
  icon_url?: string;
  color?: number;
  client_side?: "required" | "optional" | "unsupported" | "unknown";
  server_side?: "required" | "optional" | "unsupported" | "unknown";
  downloads: number;
  display_categories?: string[];
  versions: string[];
  latest_version?: string;
  gallery?: string[];
  featured_gallery: string;
};

export type ModrinthFacets = {
  type?: "mod" | "resourcepack" | "shader";
  loaders?: ("fabric" | "forge" | "neoforge")[];
  versions?: string[];
  client_side?: "required" | "optional" | "unsupported";
  server_side?: "required" | "optional" | "unsupported";
};

/**
 * Searches for modpacks on Modrinth.
 * @param searchQuery The search query to use.
 * @returns The 10 most relevant search results
 */
export async function searchModrinthProjects(
  searchQuery: string,
  facets?: ModrinthFacets,
): Promise<ModrinthProject[]> {
  const queryParams = new URLSearchParams({
    query: searchQuery,
  });

  if (facets) {
    queryParams.append("facets", parseFacets(facets));
  }

  const response = await fetch(
    `https://api.modrinth.com/v2/search?${queryParams}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return [];
  }

  return data.hits satisfies ModrinthProject[];
}

function parseFacets(facets: ModrinthFacets): string {
  let facetStrings = [];

  if (facets.type) facetStrings.push(`["project_type:${facets.type}"]`);

  if (facets.loaders) {
    const loaders = facets.loaders.map((loader) => `"categories:${loader}"`);

    facetStrings.push(`[${loaders.join(",")}]`);
  }

  if (facets.versions) {
    const versions = facets.versions.map((version) => `"versions:${version}"`);

    facetStrings.push(`[${versions.join(",")}]`);
  }

  if (facets.client_side)
    facetStrings.push(`["client_side:${facets.client_side}"]`);

  if (facets.server_side)
    facetStrings.push(`["server_side:${facets.server_side}"]`);

  return `[${facetStrings.join(",")}]`;
}
