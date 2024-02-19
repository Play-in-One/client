import ThemeSwitch from "./theme_selector";

const Header = () => {
    return (
        <header className="flex justify-between bg-2 text-1 p-4">
            <a href="/">
                <h1>Play in One</h1>
            </a>
            <div className="flex">
                <nav>
                    <ul className="flex">
                        <li className="px-2"><a href="/"> Home </a></li>
                        <li className="px-2"><a href="/products"> Products </a></li>
                    </ul>
                </nav>
                <ThemeSwitch />
            </div>
        </header>
    );
};

export default Header;