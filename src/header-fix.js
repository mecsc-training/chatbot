// Single blog posts: the Elementor header's logo section is absolutely positioned,
// so the post title (main.site-main) starts under the logo. Push content below it.
(function () {
  if (typeof document === "undefined" || document.getElementById("mecsc-header-fix")) return;
  var s = document.createElement("style");
  s.id = "mecsc-header-fix";
  s.textContent =
    "body.single-post main.site-main{padding-top:100px}" +
    "@media (min-width:768px){body.single-post main.site-main{padding-top:150px}}";
  (document.head || document.documentElement).appendChild(s);
})();
