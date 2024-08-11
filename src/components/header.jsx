import ThemeSwitch from "./theme_selector";

const Header = () => {
    const options = [
        { id: 1, title: "Home", link: "/"},
        { id: 2, title: "About", link: "/about"},
        { id: 3, title: "Products", link: "/products"},
    ];

    return (
        <header className="flex justify-between bg-2 text-1 p-4">
            <a href="/" className="place-content-center">
                <h1>Play in One</h1>
            </a>
            <div className="flex">
                <nav className="place-content-center">
                    <ul className="flex">
                        {options.map((option) => (
                            <li key={option.id} className={"p-2 hover:text-orange-400"}>
                                <a href={option.link}>
                                    {option.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
                <ThemeSwitch />
            </div>
        </header>
    );
};

export default Header;