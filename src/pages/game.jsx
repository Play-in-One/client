import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";


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
            .then(data => setProducts(data))
    }
    , [id]);

    return (
        <div>
            <h1>Game {game.title}</h1>
            {/* <p>{JSON.stringify(game)}</p> */}
            {products.map((product, index) => (
                <div key={index}>
                    <h2>Product {product.title}</h2>
                    {/* <p>{JSON.stringify(product)}</p> */}
                </div>
            ))}
        </div>
    );
}

export default Game;