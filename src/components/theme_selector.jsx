import { MoonIcon, SunIcon } from "@heroicons/react/24/outline"
import { useState, useEffect } from "react";


const GetTheme = () => {
    return localStorage.getItem("theme") || (
        window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
    )
}


const ThemeSwitch = () => {

    const [theme, setTheme] = useState(GetTheme());

    useEffect(() => {
        document.body.className = theme;
        localStorage.setItem("theme", theme)
    }, [theme]);


    return (
        <div className="h-7 w-7 m-1">
            {theme === "dark" ?
                <button className="h-full w-full" type="button" onClick={() => { setTheme("light") }}>
                    <MoonIcon className="w-auto h-auto text-object-1 hover:text-object-2" />
                </button>
                :
                <button className="h-full w-full" type="button" onClick={() => { setTheme("dark") }}>
                    <SunIcon className="w-auto h-auto text-object-1 hover:text-object-2" />
                </button>
            }
        </div>
    )
}

export default ThemeSwitch
