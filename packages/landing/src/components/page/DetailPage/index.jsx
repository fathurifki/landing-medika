import React, { useState, useEffect } from "react";
import { sanitizeHtml } from '@lib/sanitize';
import styles from "./detail.module.css"

function deriveMedia(catalogProduct, IMAGE_URL) {
    const images = [
        {
            src: catalogProduct?.productImage ? `${IMAGE_URL}/${catalogProduct.productImage}` : "",
            alt: catalogProduct?.name ? `${catalogProduct.name}` : ""
        },
        {
            src: catalogProduct?.additionalImage ? `${IMAGE_URL}/${catalogProduct.additionalImage}` : "",
            alt: catalogProduct?.name ? `additional ${catalogProduct.name}` : ""
        },
    ];

    const video = {
        id: "video",
        src: `${IMAGE_URL}/${catalogProduct?.productVideo}`,
        thumbnail: `${IMAGE_URL}/${catalogProduct?.productImage}`,
        alt: "Video Thumbnail",
    };

    return { images, video };
}

const DetailPage = ({ ...props }) => {
    // The page (SSR) already fetched this product for SEO purposes — reuse
    // it here instead of re-fetching the same data again on the client.
    const hasInitialProduct = Boolean(props.initialProduct);
    const initialMedia = hasInitialProduct
        ? deriveMedia(props.initialProduct, props.IMAGE_URL)
        : { images: [], video: {} };

    const [images, setImages] = useState(initialMedia.images);
    const [video, setVideo] = useState(initialMedia.video);
    const [mainMedia, setMainMedia] = useState({
        src: initialMedia.images[0]?.src || "",
        type: "image",
    });
    const [product, setProduct] = useState(props.initialProduct ?? {});
    const [loading, setLoading] = useState(!hasInitialProduct);

    useEffect(() => {
        // Only fetch client-side as a fallback when SSR didn't already provide the product.
        if (hasInitialProduct) return;

        async function fetchData() {
            try {
                const response = await fetch(`${props.API_URL}/items/Catalog/${props.slug}`);
                const data = await response.json();
                const catalogProduct = data?.data;
                const { images: fetchedImages, video: fetchedVideo } = deriveMedia(catalogProduct, props.IMAGE_URL);

                setProduct(catalogProduct);
                setImages(fetchedImages);
                setVideo(fetchedVideo);
                setMainMedia({ src: fetchedImages[0].src, type: "image" });
            } catch (error) {
                return false
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [props.slug]);

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
                                images?.map((image, index) => (
                                    image.src && (
                                        <div key={index} className="p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleMediaClick(image.src, "image")}>
                                            <img
                                                src={image.src}
                                                alt={image.alt}
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    )
                                ))
                            }
                            {video?.src && !video.src.includes("/null") && (
                                <div className="relative p-2 cursor-pointer hover:bg-gray-200" onClick={() => handleMediaClick(video.src, "video")}>
                                    {
                                        video?.thumbnail && (
                                            <>
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
                                            </>
                                        )
                                    }
                                </div>
                            )}
                        </div>
                        <div
                            className="flex-grow flex justify-center items-center overflow-x-auto md:overflow-auto"
                        >
                            {mainMedia.src ? (
                                mainMedia.type === "image" ? (
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
                                )
                            ) : (
                                <span className="text-gray-500 italic">Don't have photo attachment</span>
                            )}
                        </div>
                    </div>
                </div>
                <div>
                    <span className="text-2xl font-bold mb-6">Specifications</span>
                    <div className="flex flex-col">
                        <p>Name: {product?.name}</p>
                        <p>Description:</p>
                        <div className={styles.description} dangerouslySetInnerHTML={{ __html: sanitizeHtml(product?.description) }} />
                    </div>
                </div>
            </section>
        </div>
    );
}

export default DetailPage;