// http://127.0.0.1:8000/api/data/platform

import { useEffect, useState } from 'react'


const Platform = () => {
    const [platform, setPlatform] = useState([])

    useEffect(() => {
        fetch(import.meta.env.VITE_BACKEND_LINK + "/data/platform")
            .then(response => response.json())
            .then(data => setPlatform(data))
    }
    , [])

    return platform
}


export {
    Platform
};