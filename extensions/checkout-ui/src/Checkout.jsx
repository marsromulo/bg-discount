import {
  useApi,
  useTranslate,
  reactExtension,
  Divider,
  Image,
  Banner,
  Heading,
  Button,
  InlineLayout,
  BlockStack,
  Text,
  SkeletonText,
  SkeletonImage,
  useCartLines,
  useApplyCartLinesChange

} from '@shopify/ui-extensions-react/checkout';


import { useEffect, useState  } from 'react';
import $ from "jquery";

export default reactExtension(
  'purchase.checkout.block.render',
  () => <Extension />,
);

function Extension() {
  const translate = useTranslate();
  const { extension, cost } = useApi();

  const [_minimum_order, setMinimumOrder] = useState(0);
  const [_free_product, setFreeProduct] = useState({});
  const [_cart_total, setCartTotal] = useState(0);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const applyCartLinesChange = useApplyCartLinesChange();
  const [showGiftSection, setShowGiftSection] = useState(true);

  useEffect(() => {
    fetchMetafield();
    setCartTotal(cost.totalAmount.current.amount);
    setShowGiftSection(true);
  }, []);

  
  console.log("_cart_total", _cart_total);
  console.log("_minimum_order", _minimum_order);
  
  async function fetchMetafield(){

    fetch('https://dev01.babycentral.co/index.php?route=bloom/discount/getOrderDiscountMetafield')//
      .then(response => response.json())
      .then(data => 
        {
        // console.log(data);
        setMinimumOrder(data.minimum_order);
        setFreeProduct(data.products[0]);
        }
    );

  }

  async function handleAddToCart(variantId) {
    setAdding(true);
    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });
    setAdding(false);
    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }

  const handleAddFreeGift = () => {
    setShowGiftSection(false);
  }

  return (
    <>
      {
      _cart_total > _minimum_order ? (

        showGiftSection ? (
          <Banner status="info">
          <BlockStack spacing='loose' id='free-gift' >
          <Heading level={2}>FREE GIFT !</Heading>
          <BlockStack spacing='loose'>
            <InlineLayout
              spacing='base'
              columns={[64, 'fill', 'auto']}
              blockAlignment='center'
            >
              <Image
                border='base'
                borderWidth='base'
                borderRadius='loose'
                source={_free_product.img_url}
                description="the title"
                aspectRatio={1}
              />
              <BlockStack spacing='none'>
                <Text size='large' emphasis='strong'>
                  {_free_product.title}
                </Text>
                {/* <Text appearance='subdued'>0.00</Text> */}
              </BlockStack>
              <Button
                kind='primary'
                accessibilityLabel={`Add product to cart`}
                onPress={() => { 
                  handleAddFreeGift()
                  handleAddToCart(_free_product.id) 
                }}
              >
                Add
              </Button>
            </InlineLayout>
          </BlockStack>
        </BlockStack>
        </Banner>

        ) : null

      ) : null
      }
    </>
    
  );
}