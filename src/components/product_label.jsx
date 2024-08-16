import { id_to_platforms } from "../request";

var format_icon = {
    fisico:  "💿",
    digital: "💾",
}

var condition_icon = {
    new:  "✨",
    used: "♻️",
}

var platforms_colors = {
    "PC":       "border-[#000000]",
    "PS4":      "border-ps4-1",
    "PS5":      "border-ps5-1",
    "Xbox":     "border-xbox-1",
    "Switch":   "border-switch-1",
}


export const ProductLabel = ({product}) => {
    return (
        <div className='m-2 w-60'>
            <a href={"game/" + product.game} target='_blank'>
                <div className={'flex flex-col bg-3 rounded-1 items-center hover:bg-2 border-b-4 ' + platforms_colors[id_to_platforms[product.platform]]}>
                    {/* <img src={product.url_image} className="rounded-1 h-72"/> */}
                    <img src={product.url_image} className="rounded-1 h-72"/>
                    <div className="flex flex-col justify-between p-2 h-24 w-60">
                        <h1>{product.title}</h1>

                        <div className="flex justify-between">
                            <p className="font-semibold text-base">${product.price}</p>
                            <p>{id_to_platforms[product.platform]} {format_icon[product.formato]}  {product.formato === 'fisico' && condition_icon[product.condition]} </p>
                        </div>

                    </div>
                </div>
            </a>
        </div>
    )
}