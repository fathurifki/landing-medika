import { INTERNAL_API_URL } from "@lib/env";

export interface LayoutCompany {
  logoNavbar?: string;
  logoFooter?: string;
  address?: string;
  emailAddress?: string;
  phoneNumber?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
}

export interface LayoutCategory {
  id: number;
  name: string;
}

export interface LayoutSubCategory {
  id: number;
  subCategory: string;
}

export interface LayoutData {
  company: LayoutCompany | null;
  categories: LayoutCategory[];
  subCategories: LayoutSubCategory[];
}

/**
 * Navbar + Footer both need Company profile and the category taxonomy on
 * every single page render. Fetching them once here (instead of once per
 * component) halves the number of backend round-trips per page load.
 */
export async function getLayoutData(): Promise<LayoutData> {
  try {
    const [companyRes, categoryRes, subCategoryRes] = await Promise.all([
      fetch(`${INTERNAL_API_URL}/items/Company`),
      fetch(`${INTERNAL_API_URL}/items/category_product`),
      fetch(`${INTERNAL_API_URL}/items/sub_category?limit=13`),
    ]);

    const [companyJson, categoryJson, subCategoryJson] = await Promise.all([
      companyRes.ok ? companyRes.json() : null,
      categoryRes.ok ? categoryRes.json() : null,
      subCategoryRes.ok ? subCategoryRes.json() : null,
    ]);

    return {
      company: companyJson?.data ?? null,
      categories: categoryJson?.data ?? [],
      subCategories: subCategoryJson?.data ?? [],
    };
  } catch {
    return { company: null, categories: [], subCategories: [] };
  }
}
