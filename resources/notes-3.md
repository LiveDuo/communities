```sh
node -e "console.log('<html><body><b>Welcome</b></body></html>\n'.split('').map(r => r.charCodeAt(0)).join(', '))"
```

```rs
let content = vec![60, 104, 116, 109, 108, 62, 60, 98, 111, 100, 121, 62, 60, 98, 62, 87, 101, 108, 99, 111, 109, 101, 60, 47, 98, 62, 60, 47, 98, 111, 100, 121, 62, 60, 47, 104, 116, 109, 108, 62, 10];
    let store_args = StoreAssetArgs {
    key: "/index.html".to_owned(),
    content_type: "text/html".to_owned(),
    content_encoding: "identity".to_owned(),
    content: content,
};
```