import { useState, useEffect } from "react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  Text,
  IndexTable,
  LegacyCard,
  useIndexResourceState,
  Badge,
  Button,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation, Trans } from "react-i18next";
import { trophyImage } from "../assets";
import { ProductsCard } from "../components";
import { useAuthenticatedFetch } from "../hooks";
import { Redirect } from "@shopify/app-bridge/actions";

export default function HomePage() {

  const app = useAppBridge();
  const redirect = Redirect.create(app);
  const fetch = useAuthenticatedFetch();
  const [discounts, setDiscounts] = useState([]);
  

  useEffect(() => {
    // declare the async data fetching function
    const fetchDiscounts = async () => {
        const response = await fetch("/api/discounts/all");
        const data = await response.json();
        const discount_data = data.body.data.discountNodes.edges;
        setDiscounts(discount_data);  

        console.log(discount_data);
      }

    fetchDiscounts().catch(console.error);

  }, [])  

  const { t } = useTranslation();

  const handleSeeDAllDiscounts = () => {
    
  }

  const resourceName = {
    singular: 'discount',
    plural: 'discounts',
  };

  const {selectedResources, allResourcesSelected, handleSelectionChange} =
    useIndexResourceState(discounts);

    const rowMarkup = discounts.reverse().map((discount,index) => (
      discount.node.discount.title ? 
      
      (
        <IndexTable.Row
          key={index}
        >
          <IndexTable.Cell>
            <Text variant="bodyMd" fontWeight="bold" as="span">
              {discount.node.discount.title}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>{discount.node.discount.status}</IndexTable.Cell>
          <IndexTable.Cell>{discount.node.discount.codeCount ? "Code":"Automatic"}</IndexTable.Cell>
          <IndexTable.Cell>{discount.node.discount.startsAt}</IndexTable.Cell>
          <IndexTable.Cell>{discount.node.discount.endsAt}</IndexTable.Cell>
        </IndexTable.Row>
      ) :
       (null)

      ),
    );

  return (
    <Page fullWidth>
      <TitleBar title={t("HomePage.title")} primaryAction={null} />

      <Layout>
        <Layout.Section>
          <Text variant="bodyMd" fontWeight="bold" as="span">Go to main page to </Text>
        <Link url={"https://admin.shopify.com/store/test-bloom-connect/discounts"} external={false}><strong>Create Discount</strong></Link>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <Stack
              wrap={false}
              spacing="extraTight"
              distribution="trailing"
              alignment="center"
            >
              <Stack.Item fill>
                <TextContainer spacing="loose">
                  <Text as="h2" variant="headingMd">
                    Latest 10 Volume Discounts
                  </Text>
                 
                  <LegacyCard>
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={discounts.length}
                    selectedItemsCount={
                      allResourcesSelected ? 'All' : selectedResources.length
                    }
                    onSelectionChange={handleSelectionChange}
                    headings={[
                      {title: 'Title'},
                      {title: 'Status'},
                      {title: 'Method'},
                      {title: 'Start Date'},
                      {title: 'End Date'},
                    ]}
                  >
                    {rowMarkup}
                  </IndexTable>
                </LegacyCard>
                </TextContainer>
              </Stack.Item>
              {/* <Stack.Item>
                <div style={{ padding: "0 20px" }}>
                  <Image
                    source={trophyImage}
                    alt={t("HomePage.trophyAltText")}
                    width={120}
                  />
                </div>
              </Stack.Item> */}
            </Stack>
          </Card>
        </Layout.Section>
       
      </Layout>
    </Page>
  );
}
