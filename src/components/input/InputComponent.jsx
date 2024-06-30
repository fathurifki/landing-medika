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
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState({
        name: {
            _eq: ""
        },
        loading: false,
        page: 1,
        limit: 10
    });

    const [category, setCategory] = useState(props.params || '');
    const [subCategory, setSubCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [brandNames, setBrandNames] = useState([]);
    const [brand, setBrand] = useState('');

    const fetchCategory = async () => {
        const response = await fetch(`${props.API_URL}/items/category_product`);
        const data = await response.json();
        setCategories(data.data);
    }

    const fetchSubCategory = async () => {
        const response = await fetch(`${props.API_URL}/items/sub_category`);
        const data = await response.json();
        setSubCategories(data.data);
    }

    const fetchBrandName = async () => {
        const response = await fetch(`${props.API_URL}/items/brand`);
        const data = await response.json();
        setBrandNames(data.data);
    }

    const fetchData = async (filters = {}) => {
        setLoading(true);
        let url;

        let filterObject = {};
        if (filters.category && filters.category.length) {
            filterObject.product = { _eq: filters.category };
        }

        if (filters.name) {
            filterObject.name = { _eq: filters.name };
        }

        if (filters.category_product && filters.category_product !== 'all') {
            filterObject.sub_product = { _eq: +filters.category_product };
        }

        if (filters.brand && filters.brand !== 'all') {
            filterObject.brand = { _eq: filters.brand };
        }

        const query = {
            filter: JSON.stringify(filterObject),
            page: searchTerm?.page,
            limit: searchTerm?.limit
        };
        const qp = new URLSearchParams(query);
        url = `${props.API_URL}/items/Catalog?${qp}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response?.json();
            const filteredStatus = data?.data?.filter(item => item.status !== "draft");
            setProducts(filteredStatus || []);
        } catch (error) {
            return false
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (props?.url?.searchParams) {
            const subCategory = props.url.searchParams.get("sub");
            setSubCategory(subCategory);
        }
    }, [props?.url?.searchParams]);

    useEffect(() => {
        fetchCategory();
        fetchSubCategory();
        fetchBrandName();
    }, []);

    const name = useDebounce(searchTerm.name._eq, 600);

    useEffect(() => {
        const selectedCategory = category !== "" ? category : props?.params;
        const initialSubCategory = subCategory === '0' ? '' : subCategory;
        fetchData({ name: name, category: selectedCategory, category_product: initialSubCategory, brand: brand });
    }, [name, category, searchTerm.page, searchTerm.limit, subCategory, brand]);

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
                            {categories?.map((category) => (
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
                            {subCategories?.map((category) => (
                                <option key={category.id} value={category.id}>{category.sub_category}</option>
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
                            {brandNames?.map((category) => (
                                <option key={category.id} value={category.id}>{category.brand_name}</option>
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
                    {
                        products?.length ? (
                            products.map((product) => (
                                <div key={product.uuid} className="flex flex-col h-full">
                                    <div className="border border-gray-300 rounded-lg p-4 flex-grow flex justify-center items-center h-full">
                                        <div className="mb-4">
                                            <a href={`/product-detail/${product?.uuid}`}>
                                                <img
                                                    src={`${props.IMAGE_URL}/${product?.product_image}?format=webp&quality=75`}
                                                    alt={product?.name}
                                                    width={300}
                                                    height={300}
                                                    className="w-full h-auto rounded-lg object-contain"
                                                    style={{ maxWidth: '300px', maxHeight: '300px' }}
                                                />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <h3 className="text-xl font-bold">{product?.name}</h3>
                                        <p>{product?.tags?.join(", ")}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex justify-center items-center col-span-full">
                                <p className="text-lg font-semibold">No products found here</p>
                            </div>
                        )
                    }
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
                    disabled={!products?.length}
                    style={{ opacity: !products?.length ? '0.5' : '1' }}
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