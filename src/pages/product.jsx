import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";


const Product = () => {
    const { id } = useParams();

    return (
        <div>
            <h1>Product {id}</h1>
        </div>
    );
}

export default Product;