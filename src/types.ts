interface CatalogItem {
    uuid: number;
    status: string;
    sort: null;
    user_created: string;
    date_created: Date;
    product_image: string;
    name: string;
    tags: string[];
    image_files: string[];
}

interface FetchCatalogResponse {
    catalogData: CatalogItem[];
}

interface BlogItem {
    Banner: string;
    title: string;
    Content: string;
    status: string;
}

interface FetchDataResponse {
    blogData: BlogItem[];
}

export type { FetchCatalogResponse, FetchDataResponse };
