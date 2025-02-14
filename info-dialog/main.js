window.onload = async () => {
    const URLSearch = new URLSearchParams(window.location.search);
    text.append(decodeURIComponent(URLSearch.get("content")));

    ok.addEventListener("click", () => window.close());
};