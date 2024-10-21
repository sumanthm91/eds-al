import React, { useContext } from "react";
import ProgressBar from "../progress-bar/progress-bar";
import CartContext from "../../context/cart-context";

function CartAndCheckoutLayout({ showProgressBar = true, children }) {
    const { cartId, cart } = useContext(CartContext);

    return <>
        {showProgressBar ? <ProgressBar /> : null}
        {children}
    </>
}

export default CartAndCheckoutLayout;