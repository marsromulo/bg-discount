// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";

import { GraphqlQueryError } from '@shopify/shopify-api';

const CREATE_CODE_MUTATION = `
  mutation CreateCodeDiscount($discount: DiscountCodeAppInput!) {
    discountCreate: discountCodeAppCreate(codeAppDiscount: $discount) {
      codeAppDiscount {
        discountId
       }
      userErrors {
        code
        message
        field
      }
    }
  }
`;

const CREATE_AUTOMATIC_MUTATION = `
  mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
    discountCreate: discountAutomaticAppCreate(automaticAppDiscount: $discount){
        automaticAppDiscount {
          discountId
         }
      userErrors {
        code
        message
        field
      }
    }
  }
`;

const UPDATE_AUTOMATIC_MUTATION = `
    mutation ($discount_id: ID!, $title:String, $endsAt:DateTime, $shippingDiscounts:Boolean, $productDiscounts:Boolean) {
      discountAutomaticAppUpdate(
        id: $discount_id
        automaticAppDiscount: {
          title:$title,
          endsAt:$endsAt,
          combinesWith: {
            shippingDiscounts: $shippingDiscounts,
            productDiscounts: $productDiscounts
          }
        }
      ) {
        userErrors {
          field
          message
        }
      }
    }
`;

const UPDATE_CODE_MUTATION = `
    mutation ($discount_id: ID!, $title:String, $endsAt:DateTime, $shippingDiscounts:Boolean, $productDiscounts:Boolean, $appliesOncePerCustomer: Boolean, $usageLimit: Int) {
      discountCodeAppUpdate(
        id: $discount_id
        codeAppDiscount: {
          title:$title,
          endsAt:$endsAt,
          combinesWith: {
            shippingDiscounts: $shippingDiscounts,
            productDiscounts: $productDiscounts
          },
          usageLimit:$usageLimit,
          appliesOncePerCustomer: $appliesOncePerCustomer
        }
      ) {
        userErrors {
          field
          message
        }
      }
    }
`;


const QUERY_DISCOUNT_NODE = `
query ($id: ID!) {
  discountNode(id: $id) {
    discount {
      ... on DiscountCodeApp {
        endsAt
        startsAt
        codes(first: 1) {
          edges {
            node {
              code
            }
          }
        }
        title
        combinesWith {
          orderDiscounts
          productDiscounts
          shippingDiscounts
        }
        usageLimit
        appliesOncePerCustomer
      }
      ... on DiscountAutomaticApp {
        endsAt
        startsAt
        title
        combinesWith {
          orderDiscounts
          productDiscounts
          shippingDiscounts
        }
      }
    }
    metafields(first: 1) {
      nodes {
        value
        id
      }
    }
  }
}
`

const DELETE_DISCOUNT_AUTOMATIC_MUTATION = `
  mutation ($id: ID!) {
    discountAutomaticDelete (id: $id) {
      deletedAutomaticDiscountId
      userErrors {
        code
        field
        message
      }
    }
  }
`

const DELETE_DISCOUNT_CODE_MUTATION = `
mutation ($id: ID!) {
  discountCodeDelete (id: $id) {
    deletedCodeDiscountId
    userErrors {
      code
      field
      message
    }
  }
}
`

const QUERY_PRODUCTS_BY_COLLECTION_ID = `
query ProductsByCollection($id: ID!) {
  collection(id: $id) {
    handle
    products(first: 50) {
      nodes {
        title
        id
        images(first: 1) {
          edges {
            node {
              url
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
}`

const UPDATE_AUTOMATIC_METFAFIELD_MUTATION = `mutation ($discount_id:ID!, $value:String) {
  discountAutomaticAppUpdate(
    id: $discount_id,
    automaticAppDiscount: {
      metafields: [
        {
          namespace: "volume-discount"
          key: "function-configuration"
          value: $value
          type: "json"
        }
      ]
    }
) {
    userErrors {
      field
      message
    }
  }
}`;


const UPDATE_CODE_METFAFIELD_MUTATION = `mutation ($discount_id:ID!, $value:String) {
  discountCodeAppUpdate(
    id: $discount_id,
    codeAppDiscount: {
      metafields: [
        {
          namespace: "volume-discount"
          key: "function-configuration"
          value: $value
          type: "json"
        }
      ]
    }
) {
    userErrors {
      field
      message
    }
  }
}`;



const UPDATE_AUTOMATIC_METFAFIELD_MUTATION_EDIT = `mutation ($discount_id:ID!, $metafield_id:ID!, $value:String) {
  discountAutomaticAppUpdate(
    id: $discount_id,
    automaticAppDiscount: {
      metafields: [
        {
          id: $metafield_id
          value: $value
        }
      ]
    }
) {
    userErrors {
      field
      message
    }
  }
}`;


const UPDATE_CODE_METFAFIELD_MUTATION_EDIT = `mutation ($discount_id:ID!, $metafield_id:ID!, $value:String) {
  discountCodeAppUpdate(
    id: $discount_id,
    codeAppDiscount: {
      metafields: [
        {
          id: $metafield_id
          value: $value
        }
      ]
    }
) {
    userErrors {
      field
      message
    }
  }
}`;


const QUERY_FETCH_DISCOUNTS = `{
  discountNodes(first: 80) {
    edges {
      node {
        id
        discount {
          ... on DiscountAutomaticApp {
            title
            status
            endsAt
            startsAt
          }
          ... on DiscountCodeApp {
            title
            status
            endsAt
            startsAt
            codeCount
          }
        }
        metafields(first: 1) {
          edges {
            node {
              value
            }
          }
        }
      }
    }
  }
}`


const GET_SHOP_QUERY = `
query {
	shop {
		id
	}
}
`;

const GET_SHOP_METAFIELD_QUERY = `
query {
	shop {
    metafield(namespace: "order-discount", key: "products") {
      value
    }
  }
}
`

const SET_METAFIELDS_MUTATION = `
mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    userErrors {
      field
      message
    }
  }
}
`;


const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

const runDiscountMutation = async (req, res, mutation) => {
  
  const graphqlClient = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session
  });

  try {
    const data = await graphqlClient.query({
      data: {
        query: mutation,
        variables: req.body,
      },
    });

    res.send(data.body);
  } catch (error) {
    // Handle errors thrown by the GraphQL client
    if (!(error instanceof GraphqlQueryError)) {
      throw error;
    }
    return res.status(500).send({ error: error.response });
  }
  
};


// get all volume discount discounts
app.get("/api/discounts/all", async (req, res) => {
  let status = 200;
  const response = await runGetAllDiscounts(req, res, QUERY_FETCH_DISCOUNTS);
  res.send(response);
});


// Endpoint to create code-based discounts
app.post("/api/discounts/create/code", async (req, res) => {
  let status = 200;
  const response = await runDiscountMutation(req, res, CREATE_CODE_MUTATION);
  res.send(response);
});

// Endpoint to create automatic discounts
app.post("/api/discounts/create/automatic", async (req, res) => {
  let status = 200;
  const response = await runDiscountMutation(req, res, CREATE_AUTOMATIC_MUTATION);
  res.send(response);
});



// Endpoint to udpate automatic discounts
app.post("/api/discounts/update/automatic", async (req, res) => {
  let status = 200;
  const response = await runDiscountAutomaticUpdateMutation(req, res, UPDATE_AUTOMATIC_MUTATION);
  res.send(response);
});

app.post("/api/discounts/update/code", async (req, res) => {
  let status = 200;
  const response = await runDiscountCodeUpdateMutation(req, res, UPDATE_CODE_MUTATION);
  res.send(response);
});

const runDiscountAutomaticUpdateMutation = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        discount_id:req.body.discount_id,
        title: req.body.discount.title,
        startsAt: req.body.discount.startsAt,
        endsAt: req.body.discount.endsAt,
        shippingDiscounts: req.body.discount.shippingDiscounts,
        productDiscounts: req.body.discount.productDiscounts
      },
    },
  });

  return response
}

const runDiscountCodeUpdateMutation = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        discount_id:req.body.discount_id,
        title: req.body.discount.title,
        startsAt: req.body.discount.startsAt,
        endsAt: req.body.discount.endsAt,
        shippingDiscounts: req.body.discount.shippingDiscounts,
        productDiscounts: req.body.discount.productDiscounts,
        appliesOncePerCustomer: req.body.discount.appliesOncePerCustomer,
        usageLimit: req.body.discount.usageLimit,
      },
    },
  });

  return response
}


//  query single discount
app.post("/api/discount/node", async (req, res) => {
  let status = 200;
  const response = await runDiscountNodeQuery(req, res, QUERY_DISCOUNT_NODE);
  res.status(status).send(response);

});

const runDiscountNodeQuery = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        id: req.body.id
      },
    },
  });

  return response
}

//  query single discount
app.post("/api/product/variants", async (req, res) => {
  let status = 200;
  const response = await runProductVariantsQuery(req, res, QUERY_PRODUCTS_BY_COLLECTION_ID);
  res.status(status).send(response);

});

// update metafield
app.post("/api/discount/update/automatic/metafield", async (req, res) => {
  let status = 200;
  const response = await runMetafieldUpdateMutation(req, res, UPDATE_AUTOMATIC_METFAFIELD_MUTATION);
  res.send(response);
});
app.post("/api/discount/update/code/metafield", async (req, res) => {
  let status = 200;
  const response = await runMetafieldUpdateMutation(req, res, UPDATE_CODE_METFAFIELD_MUTATION);
  res.send(response);
});


// update metafield EDIT
app.post("/api/discount/update/automatic/metafield/edit", async (req, res) => {
  let status = 200;
  const response = await runMetafieldUpdateMutationEdit(req, res, UPDATE_AUTOMATIC_METFAFIELD_MUTATION_EDIT);
  res.send(response);
});
app.post("/api/discount/update/code/metafield/edit", async (req, res) => {
  let status = 200;
  const response = await runMetafieldUpdateMutationEdit(req, res, UPDATE_CODE_METFAFIELD_MUTATION_EDIT);
  res.send(response);
});



const runDiscountNodeDelete = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        id: req.body.id
      },
    },
  });

  return response
}

const runProductVariantsQuery = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        id: req.body.id
      },
    },
  });

  return response
}


const runMetafieldUpdateMutation = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        discount_id:req.body.discount_id,
        value: req.body.value
      },
    },
  });

  return response
}

const runMetafieldUpdateMutationEdit = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation,
      variables: {
        discount_id:req.body.discount_id,
        value: req.body.value,
        metafield_id: req.body.metafield_id
      },
    },
  });

  return response
}

const runGetAllDiscounts = async (req, res, mutation) => { 
  const client = new shopify.api.clients.Graphql({ session: res.locals.shopify.session });
  const response =  await client.query({
    data: {
      query: mutation
    },
  });

  return response
}

//  delete discount automatic
app.post("/api/discount/automatic/delete", async (req, res) => {

  let status = 200;
  const response = await runDiscountNodeDelete(req, res, DELETE_DISCOUNT_AUTOMATIC_MUTATION);
  res.status(status).send(response);

});

//  delete discount code
app.post("/api/discount/code/delete", async (req, res) => {

  let status = 200;
  const response = await runDiscountNodeDelete(req, res, DELETE_DISCOUNT_CODE_MUTATION);
  res.status(status).send(response);

});


app.get("/api/products/count", async (_req, res) => {
  const countData = await shopify.api.rest.Product.count({
    session: res.locals.shopify.session,
  });
  res.status(200).send(countData);
});

app.get("/api/products/create", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});


// SET SHOP METAFIELDS
app.get("/api/shop", async (req, res) => {
  await runGraphql(req, res, GET_SHOP_QUERY);
});

app.post("/api/metafields/set", async (req, res) => {
  await runGraphql(req, res, SET_METAFIELDS_MUTATION);
});


app.get("/api/metafields/get", async (req, res) => {
  await runGraphql(req, res, GET_SHOP_METAFIELD_QUERY);
});

const runGraphql = async (req, res, mutation) => {
  const graphqlClient = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session
  });

  try {
    const data = await graphqlClient.query({
      data: {
        query: mutation,
        variables: req.body,
      },
    });

    res.send(data.body);
  } catch (error) {
    // Handle errors thrown by the graphql client
    if (!(error instanceof GraphqlQueryError)) {
      throw error;
    }
    return res.status(500).send({ error: error.response });
  } 
};

// END SET SHOP METAFIELDS


app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
