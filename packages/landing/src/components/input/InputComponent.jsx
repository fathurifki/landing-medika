import React, { useState, useEffect } from 'react';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

const InputComponent = ({ ...props }) => {
    const subCategoryProps = props?.url?.searchParams?.get("sub");

    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState({
        name: {
            _eq: ""
        },
        loading: false,
        page: 1,
        limit: 10
    });

    const [category, setCategory] = useState(props?.params || '');
    const [subCategory, setSubCategory] = useState(subCategoryProps || '');
    const [loading, setLoading] = useState(false);
    // Taxonomy is already fetched server-side (same data Navbar/Footer use) —
    // seed state with it so we skip a redundant client-side fetch on mount.
    const [categories, setCategories] = useState(props?.initialCategories || []);
    const [subCategories, setSubCategories] = useState(props?.initialSubCategories || []);
    const [brandNames, setBrandNames] = useState(props?.initialBrands || []);
    const [brand, setBrand] = useState('');

    const name = useDebounce(searchTerm.name._eq, 600);

    const fetchCategory = async () => {
        const response = await fetch(`${props.API_URL}/items/category_product`);
        const data = await response.json();
        setCategories(data.data);
    };

    const fetchSubCategory = async () => {
        const response = await fetch(`${props.API_URL}/items/sub_category`);
        const data = await response.json();
        setSubCategories(data.data);
    };

    const fetchBrandName = async () => {
        const response = await fetch(`${props.API_URL}/items/brand`);
        const data = await response.json();
        setBrandNames(data.data);
    };

    const fetchData = async (filters = {}) => {
        const params = new URLSearchParams();
        params.set("page", searchTerm.page);
        params.set("limit", searchTerm.limit);
        params.set("status", "published");

        if (filters.name) params.set("search", filters.name);
        // Only filter by subProduct/brand if explicitly set — skip category since
        // catalog rows have product=null (no category assignment in migrated data)
        if (filters.category_product && filters.category_product !== "all") params.set("subProduct", filters.category_product);
        if (filters.brand && filters.brand !== "all") params.set("brandId", filters.brand);

        const url = `${props.API_URL}/items/Catalog?${params}`;

        try {
            setLoading(true);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setProducts(data?.data || []);
        } catch (error) {
            console.error('Fetching error:', error);
        } finally {
            setLoading(false);
        }
    };

    // useEffect(() => {
    //     if (props?.url?.searchParams) {
    //         const subCategory = props?.url?.searchParams?.get("sub");
    //         setSubCategory(subCategory);
    //     }
    // }, [props?.url?.searchParams]);

    useEffect(() => {
        // Only fetch client-side as a fallback when SSR didn't already provide taxonomy.
        if (!props?.initialCategories) fetchCategory();
        if (!props?.initialSubCategories) fetchSubCategory();
        if (!props?.initialBrands) fetchBrandName();
    }, []);

    useEffect(() => {
        const subCategoryProps = props?.url?.searchParams?.get("sub");
        const initialSubCategory = subCategory ? subCategory : subCategoryProps;
        fetchData({ name: name, category_product: initialSubCategory, brand: brand });
    }, [name, searchTerm.page, searchTerm.limit, subCategory, brand, props?.url?.searchParams]);

    return (
        <div>
            <input
                type="text"
                value={searchTerm.name._eq}
                onChange={(e) => setSearchTerm({ ...searchTerm, name: { _eq: e.target.value } })}
                placeholder="Search product name"
                className="w-full p-2 border border-gray-300 rounded"
            />

            <section id="product-filters" className="mb-8 mt-4">
                <h2 className="text-2xl font-bold mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="category" className="block mb-2">Category</label>
                        <select
                            id="category"
                            className="w-full p-2 border border-gray-300 rounded"
                            onChange={(e) => setCategory(e.target.value)}
                            value={category}
                        >
                            <option value="all">All</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sub-category" className="block mb-2">Sub Category</label>
                        <select
                            id="sub-category"
                            className="w-full p-2 border border-gray-300 rounded"
                            onChange={(e) => setSubCategory(e.target.value)}
                            value={subCategory}
                        >
                            <option value="all">All</option>
                            {subCategories.map((category) => (
                                <option key={category.id} value={category.id}>{category.subCategory}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="brand-name" className="block mb-2">Brand Name</label>
                        <select
                            id="brand-name"
                            className="w-full p-2 border border-gray-300 rounded"
                            onChange={(e) => setBrand(e.target.value)}
                            value={brand}
                        >
                            <option value="all">All</option>
                            {brandNames.map((category) => (
                                <option key={category.id} value={category.id}>{category.brandName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {loading ? (
                <div className="flex justify-center items-center">
                    <p>Loading...</p>
                </div>
            ) : (
                <section
                    id="product-list"
                    className="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    {products?.length ? (
                        products?.map((product) => (
                            <div key={product.uuid} className="flex flex-col h-full">
                                <div className="border border-gray-300 rounded-lg p-4 flex-grow flex justify-center items-center h-72">
                                    <div className="mb-4 w-full h-full flex justify-center items-center">
                                        <a href={`/product-detail/${product.uuid}`} className="w-full h-full flex justify-center items-center">
                                            {product?.productImage ? (
                                                <img
                                                    src={`${props.IMAGE_URL}/${product.productImage}`}
                                                    alt={product.name}
                                                    className="w-full h-full rounded-lg object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full font-bold text-2xl object-contain flex justify-center items-center">
                                                    <p>Attachment Soon</p>
                                                </div>
                                            )}
                                        </a>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <h3 className="text-xl font-bold">{product.name}</h3>
                                    <p>{product?.tags?.join(", ")}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex justify-center items-center col-span-full">
                            <p className="text-lg font-semibold">No products found here</p>
                        </div>
                    )}
                </section>
            )}

            <section id="pagination" className="flex justify-center space-x-4 mt-8">
                <button
                    className="p-2 rounded block text-center flex items-center"
                    onClick={(e) => {
                        e.preventDefault();
                        setSearchTerm({ ...searchTerm, page: searchTerm.page - 1 });
                    }}
                    disabled={searchTerm.page <= 1}
                    style={{ opacity: searchTerm.page <= 1 ? '0.5' : '1' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                        <path fill="currentColor" d="m14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6z" />
                    </svg>
                    Previous
                </button>

                <button
                    className="p-2 rounded block text-center flex items-center"
                    onClick={(e) => {
                        e.preventDefault();
                        setSearchTerm({ ...searchTerm, page: searchTerm.page + 1 });
                    }}
                    disabled={!products.length}
                    style={{ opacity: !products.length ? '0.5' : '1' }}
                >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z" />
                    </svg>
                </button>
            </section>
        </div>
    );
};

export default InputComponent;