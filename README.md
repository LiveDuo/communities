<h1 align="center">Communities.ooo</h1>

<h4 align="center">A tool that creates online communities on the <a href="https://internetcomputer.org/" target="_blank">Internet Computer</a>.</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Download</a> •
  <a href="#how-it-works">How it works</a> •
  <a href="#development">Development</a> •
  <a href="#faq">FAQ</a>
</p>

![image](./.notes/assets/landing/hero.png)

"Communities" is a tool that creates online communities owned by the creators. They can invite their followers, fans or readers to their community to discuss, share ideas and interact. Users can login with their Ethereum, Solana or IC account using the standard browser extensions.

![image](./.notes/assets/landing/features.png)

Today, creators build and interact with their fan base on third-party platforms. We believe they should truly own the space they created, literally, in their wallet.

## Screenshots

<p>
  <img src="./.notes/assets/screenshots/community.png" width="48%" />
  <img src="./.notes/assets/screenshots/sign-in.png" width="48%" />
  <br/>
  <img src="./.notes/assets/screenshots/reply-editor.png" width="48%" />
  <img src="./.notes/assets/screenshots/moderation-page.png" width="48%" /> 
</p>

## How it works

<details>
<summary>Deploying a community</summary>

<br/>

To achieve complete ownership of a community we require that there's a special canister (the parent) that deploys the community canisters (the children). The parent right now is controlled by us and could be autonomous in the future. When a creator creates a new community a couple things happen in the background. First the creator transfers ~0.10$ in ICP + 10% to account for the operation. When the transfer is done, a new canister is created and then the frontend assets are uploaded to the canisters. After the upload the child canister is ready and ownership of that newly created canister is transferred from the parent canister to the creator. At that point the creator has complete ownership of the community as a canister controller.

</details>


<details>
<summary>Databases, tables and indexes</summary>

<br/>

As this project is relational by nature, simple key-store data structures wouldn't cut it. Instead we needed data structures that are very similar to conventional SQL databases. For that reason we implemented a relational-style databases using tables, relations and indexes in the Internet Computer. More specifically, tables a maps from record id to record data, relations are two-way ordered maps from a record id of one table to a record id of another table and indexes are either maps or ordered maps for ordered data. Note that when we first design our database, stable memory was not mature enough so we are using heap memory at the moment but the same design applies to stable memory as well.

</details>


<details>
<summary>Custom domains</summary>

<br/>

To assign a custom domain a creator has to enter that domain from "Custom domain" modal and then added the displayed DNS records to their DNS registrar. Behind the since a request is made to the backend that starts the domain registration process. First the domain is stored in the database and a TXT file is the hosted in the canister for  the Internet computer to verify. Every 6 hours, a timer is trigger in the canister that notifies the Internet computer about the newly registered domain, then if the DNS records are set correctly the Internet computer allows that domain to be used for that canister. If that request succeeds the domain is marked as "done" in the database otherwise the error is stored and is shown to the creator once they open the "Custom domain" modal again.

</details>


<details>
<summary>[TODO] Community upgrades</summary>

<br/>

... parent structs

</details>


<details>
<summary>[TODO] Web3 logins</summary>

<br/>

... Ethereum / Solana

</details>


<details>
<summary>ICRC standards</summary>

<br/>

Since one of that major goals of the project was to own communities as NFTs, we had to made the project compliant with either DIP721 or ICRC7 standards and from various discussions with community members we decided on the latter. Since the ICRC7 standard is not fully adopted yet by wallets and marketplaces this feature is not tested in real conditions yet. This feature will be revised once these parties adopt the standard further.

</details>


<br/>

- TODO Include diagrams
- TODO Include links to code



## Run locally

This project depends on:

1. `node` and `npm` for frontends and scripts

2. `rust`, `cargo` and `dfx` for backends


<details>
<summary>Start the `parent` canister</summary>

<br/>

```sh
npm i # install deps

dfx start --clean # separate terminal
dfx deploy parent

npm run upload:parent
npm run dev:parent
```

</details>


<details>
<summary>Start the `child` canister</summary>

<br/>

```sh
npm i # install deps

dfx start --clean # separate terminal
dfx deploy child

npm run dev:child
```

</details>

## FAQ

<details>
<summary>What does community ownership means?</summary>

<br/>

New communities are owned and controlled from your Internet Computer wallet.

If you owned a community you have special privilege to assign moderators, take the community offline or transfer the ownership to another person if you wish to.

</details>

<details>
<summary>Where are communities hosted if no servers are involved?</summary>

<br/>

All communities run on the Internet Computer. They are assigned a subnet of 13 nodes that takes care of hosting the service. When user create a post, sends a reply or uploads a picture all nodes should come in consensus over the result of that operation.

Since there isn't anyone in the middle, server costs can only be increased by Internet Computer onchain governance.

</details>

<details>
<summary> How do I manage my community?</summary>

<br/>

The wallet that created a community is assigned the "Admin".

They will be able to hide replies they deemed inappropriate, lock posts and assign other moderators to have these special privileges too.

</details>
<br/>

## Contributors

<a href="https://github.com/liveduo/communities/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=LiveDuo/communities" />
</a>

Made with [contributors-img](https://contrib.rocks).  

## Acknowledgments

We maintained a fork of [`ic-certified-assets`](https://github.com/dfinity/sdk/tree/master/src/canisters/frontend/ic-frontend-canister) (later renamed to `ic-frontend-canister`). Credits to its original creators.
