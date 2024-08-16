import { Link, useNavigate, useParams } from "react-router-dom";


const Home = () => {

    return (
        <div>
            <div className="m-3">
                <div className="flex flex-col items-center">
                    <p className="text-5xl">Sobre nosotros</p>
                    <p className="text-xl">Somos universitarios y xd</p>
                </div>

                <div className="flex flex-col items-center">
                    <p className="text-3xl">¿Qué es PIO?</p>
                    <p className="text-xl">PIO es xd</p>
                </div>
            </div>

            <div className="m-16">
                {/* Buscar juegos: */}
                <div className="flex flex-row justify-between">
                    <Link to="games/PS4">
                        <button className="text-4xl bg-ps4-1 w-72 h-32 rounded-2xl">PS4</button>
                    </Link>
                    <Link to="games/PS5">
                        <button className="text-4xl bg-ps5-1 w-72 h-32 rounded-2xl">PS5</button>
                    </Link>
                    <Link to="games/Xbox">
                        <button className="text-4xl bg-xbox-1 w-72 h-32 rounded-2xl">Xbox</button>
                    </Link>
                    <Link to="games/Switch">
                        <button className="text-4xl bg-switch-1 w-72 h-32 rounded-2xl">Switch</button>
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default Home;