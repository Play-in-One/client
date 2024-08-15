import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";


const Game = () => {
    const { id } = useParams();

    useEffect(() => {
        console.log(id);
        const sas = new URLSearchParams(location.search);
        console.log(sas.get('search'));
    }, [id]);

    const [game, setGame] = useState({});
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch(import.meta.env.VITE_BACKEND_LINK + "/games/" + id + "/")
            .then(response => response.json())
            .then(data => setGame(data))
        fetch(import.meta.env.VITE_BACKEND_LINK + "/products/" + "?game=" + id)
            .then(response => response.json())
            .then(data => setProducts(data['results']))
    }
    , [id]);

    return (
        <div>
            <h1>Game {game.title}</h1>
            {/* <h1>{game.url_image}</h1> */}
            <img src={game.url_image} className="h-96" />
            {/* <p>{JSON.stringify(game)}</p> */}
            {products.map((product, index) => (
                <div key={index} className="bg-2 rounded-1 m-5">
                    <Link to={product.url}>
                        <h2>Product {product.title}</h2>
                        <h2>Plataforma {product.platform}</h2>
                        <h2>Tienda {product.seller}</h2>
                        <h2>precio {product.price}</h2>
                    </Link>
                    {/* <p>{JSON.stringify(product)}</p> */}
                </div>
            ))}
        </div>
    );
}

export default Game;