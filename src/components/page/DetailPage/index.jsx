import React, { useState, useEffect } from "react";
import DOMPurify from 'isomorphic-dompurify';
import styles from "./detail.module.css"

const DetailPage = ({ ...props }) => {
    const API_URL = import.meta.env.PUBLIC_API;
    const IMAGE_URL = import.meta.env.PUBLIC_IMAGE;

    const [images, setImages] = useState([]);
    const [video, setVideo] = useState({});
    const [mainMedia, setMainMedia] = useState({ src: "", type: "image" });
    const [product, setProduct] = useState({});

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(`${API_URL}/items/Catalog/${props.slug}`);
                const data = await response.json();
                const catalogProduct = data?.data;

                const fetchedImages = [
                    { src: `${IMAGE_URL}/${catalogProduct?.product_image}`, alt: `${catalogProduct?.name}` },
                    {
                        src: `${IMAGE_URL}/${catalogProduct?.additional_image}`,
                        alt: `additional ${catalogProduct?.name}`,
                    },
                ];

                const fetchedVideo = {
                    id: "video",
                    src: `${IMAGE_URL}/${catalogProduct?.product_video}`,
                    thumbnail: `${IMAGE_URL}/${catalogProduct?.product_image}`,
                    alt: "Video Thumbnail",
                };

                setProduct(catalogProduct);
                setImages(fetchedImages);
                setVideo(fetchedVideo);
                setMainMedia({ src: fetchedImages[0].src, type: "image" });
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        fetchData();
    }, []);

    const handleMediaClick = (src, type) => {
        setMainMedia({ src, type });
    };

    return (
        <div>
            <section id="product-details" className="mb-8 grid grid-cols-1 gap-4">
                <span className="text-2xl font-bold">Product Details</span>
                <div>
                    <div
                        className="flex flex-col-reverse md:flex-row w-full h-screen bg-gray-100 overflow-x-auto md:overflow-auto"
                    >
                        <div
                            className="w-full flex md:w-1/4 bg-white border-r overflow-x-auto md:overflow-auto md:flex-col"
                        >
                            {
                                images.map((image, index) => (
                                    <div key={index} className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleMediaClick(image.src, "image")}>
                                        <img
                                            src={image.src}
                                            alt={image.alt}
                                            className="w-full h-auto"
                                        />
                                    </div>
                                ))
                            }
                            <div className="relative p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleMediaClick(video.src, "video")}>
                                <img
                                    src={video?.thumbnail}
                                    alt={video?.alt}
                                    className="w-full h-auto"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black bg-opacity-50 rounded-full p-2">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-12 w-12 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M14.752 11.168l-5.197-3.03A1 1 0 008 9.03v5.94a1 1 0 001.555.832l5.197-3.03a1 1 0 000-1.664z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div
                            className="flex-grow flex justify-center items-center overflow-x-auto md:overflow-auto"
                        >
                            {mainMedia.type === "image" ? (
                                <img
                                    id="main-media"
                                    src={mainMedia.src}
                                    alt="Main Media"
                                    className="max-w-full max-h-full"
                                />
                            ) : (
                                <video
                                    id="main-media-video"
                                    controls
                                    className="max-w-full max-h-full"
                                >
                                    <source
                                        id="main-video-source"
                                        src={mainMedia.src}
                                        type="video/mp4"
                                    />
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    </div>
                </div>
                <div>
                    <span className="text-2xl font-bold mb-6">Specifications</span>
                    <div className="flex flex-col">
                        <p>Name: {product.name}</p>
                        <p>Description:</p>
                        <div className={styles.description} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.Description) }} />
                    </div>
                </div>
            </section>
        </div>
    );
}

export default DetailPage;