import React, { useState, useEffect } from 'react';

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
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    const fetchCategory = async () => {
        const response = await fetch(`${props.API_URL}/items/category_product`);
        const data = await response.json();
        setCategories(data.data);
    }

    const fetchData = async (filters = {}) => {
        setLoading(true);
        try {
            let url;

            let filterObject = {};
            if (filters.name !== "") {
                filterObject.name = { _eq: filters.name };
            }

            if (filters.category !== "") {
                filterObject.category = { _eq: filters.category };
            }

            if (filters.name === "" && Object.keys(filters.category).length === 0) {
                filterObject = {};
            }

            const query = {
                filter: JSON.stringify(filterObject),
                page: searchTerm?.page,
                limit: searchTerm?.limit
            };
            const qp = new URLSearchParams(query);
            url = `${props.API_URL}/items/Catalog?${qp}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const filteredStatus = data.data.filter(item => item.status !== "draft")
            setProducts(filteredStatus || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategory();
    }, []);

    useEffect(() => {
        const selectedCategory = category !== "" ? category : props.params;
        fetchData({ name: searchTerm.name._eq, category: selectedCategory });
    }, [searchTerm.name._eq, category, searchTerm.page, searchTerm.limit, props.params]);

    return (
        <div>
            <input
                type="text"
                value={searchTerm.name._eq}
                onChange={(e) => setSearchTerm({ ...searchTerm, name: { _eq: e.target.value } })}
                placeholder="Search product name"
                className="w-full p-2 border border-gray-300 rounded"
            />

            <section id="product-filters" class="mb-8 mt-4">
                <h2 class="text-2xl font-bold mb-4">Filters</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="category" class="block mb-2">Category</label>
                        <select
                            id="category"
                            class="w-full p-2 border border-gray-300 rounded"
                            onChange={(e) => setCategory(e.target.value)}
                            value={category}
                        >
                            <option value="">All</option>
                            {categories.map((category) => (
                                <option value={category.id}>{category.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {loading ? (
                <div class="flex justify-center items-center">
                    <p>Loading...</p>
                </div>
            ) : (
                <section
                    id="product-list"
                    class="grid grid-cols-1 md:grid-cols-3 gap-8"
                >
                    {
                        products?.length ? (
                            products.map((product) => (
                                <div class="flex flex-col h-full">
                                    <div class="border border-gray-300 rounded-lg p-4 flex-grow flex justify-center items-center h-full">
                                        <div class="mb-4">
                                            <a href={`/product-detail/${product?.uuid}`}>
                                                <img
                                                    src={`${props.IMAGE_URL}/${product?.product_image}`}
                                                    alt={product?.name}
                                                    width={300}
                                                    height={300}
                                                    className="w-full h-auto rounded-lg object-contain"
                                                    style={{ maxWidth: '300px', maxHeight: '300px' }}
                                                />
                                            </a>
                                        </div>
                                    </div>
                                    <div class="mt-2">
                                        <h3 class="text-xl font-bold">{product?.name}</h3>
                                        <p>{product?.tags?.join(", ")}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div class="flex justify-center items-center col-span-full">
                                <p class="text-lg font-semibold">No products found here</p>
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