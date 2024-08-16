import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { id_to_platforms } from "../request";

const Game = () => {
    const { id } = useParams();

    // useEffect(() => {
    //     console.log(id);
    //     const sas = new URLSearchParams(location.search);
    //     console.log(sas.get('search'));
    // }, [id]);

    const [game, setGame] = useState({});
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch(import.meta.env.VITE_BACKEND_LINK + "/games/" + id + "/")
            .then(response => response.json())
            .then(data => setGame(data))
        fetch(import.meta.env.VITE_BACKEND_LINK + "/products/?" + new URLSearchParams({
                game: id
            }))
            .then(response => response.json())
            .then(data => setProducts(data['results']))
    }
    , [id]);


    return (
        <div className="flex flex-col items-center">

            <h1 className="text-7xl text-center m-6">
                Game {game.title}
            </h1>

            <div className="flex flex-row">

                <img
                    className="h-[600px]"
                    src={game.url_image}
                />

                <div className="flex flex-col m-2">
                    {products.map((product, index) => (
                        <div key={index} className="bg-2 hover:bg-3 rounded-1 m-5 w-[400px] p-3">
                            <Link to={product.url}>
                                <p>Product {product.title}</p>
                                <p>Plataforma {id_to_platforms[product.platform]}</p>
                                <p>Tienda {product.seller}</p>
                                <p>{product.formato}</p>
                                {product.formato === 'fisico' && <p>{product.condition}</p>}
                                <p className="text-center text-2xl font-semibold">
                                    ${product.price}
                                </p>
                            </Link>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

export default Game;