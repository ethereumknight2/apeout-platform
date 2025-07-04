
import React from "react";

export default function LaunchToken() {
  return (
    <form>
      <h2>Launch a New Token</h2>
      <input placeholder="Token Name" />
      <input placeholder="Symbol" />
      <input placeholder="Description" />
      <input placeholder="Website URL" />
      <input placeholder="Twitter Handle" />
      <button type="submit">Launch</button>
    </form>
  );
}
    