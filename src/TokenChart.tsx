
import React, { useEffect, useState } from "react";
import { fetchPriceHistory } from "./token_metadata";

export default function TokenChart({ tokenId }) {
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    fetchPriceHistory(tokenId).then(setPrices);
  }, [tokenId]);

  return (
    <div>
      <h3>Price Chart</h3>
      {prices.map(p => (
        <div key={p.timestamp}>{p.timestamp}: {p.price}</div>
      ))}
    </div>
  );
}
    