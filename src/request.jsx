// http://127.0.0.1:8000/api/data/platform

// import { useEffect, useState } from 'react'
import axios from 'axios'



const id_to_platforms = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/data/platform", {
    params:{
        invert: true
    }
})
.then(response => response.data);

const platforms_to_id = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/data/platform", {
    params:{
        invert: false
    }
})
.then(response => response.data);



export {
    id_to_platforms,
    platforms_to_id
};