import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useForm, useField } from "@shopify/react-form";
import { CurrencyCode } from "@shopify/react-i18n";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge, ResourcePicker } from "@shopify/app-bridge-react";
import SelectedProductCard from '../../../components/SelectedProductCard';
import SelectedCollectionCard from "../../../components/SelectedCollectionCard";
import $ from "jquery";

import {
    AppliesTo,
    ActiveDatesCard,
    CombinationCard,
    DiscountClass,
    DiscountMethod,
    MinimumRequirementsCard,
    MethodCard,
    DiscountStatus,
    RequirementType,
    SummaryCard,
    UsageLimitsCard,
    onBreadcrumbAction,
} from "@shopify/discount-app-components";
import {
    Banner,
    Card,
    Layout,
    Page,
    TextField,
    Stack,
    PageActions,
    VerticalStack,
    Text,
    InlineError,
    LegacyCard,
    LegacyStack,
    ButtonGroup,
    Button
} from "@shopify/polaris";
import { data } from "@shopify/app-bridge/actions/Modal";
import { useAuthenticatedFetch } from "../../../hooks";

const todaysDate = new Date();
// Metafield that will be used for storing function configuration
const METAFIELD_NAMESPACE = "$app:order-discount";
const METAFIELD_CONFIGURATION_KEY = "function-configuration";

export default function OrderNew() {
    // Read the function ID from the URL
    const { functionId } = useParams();

    const app = useAppBridge();
    const redirect = Redirect.create(app);
    const currencyCode = CurrencyCode.Cad;
    const authenticatedFetch = useAuthenticatedFetch();

    const [productPickerOpen, setProductPickerOpen] = useState(false); 
    const [collectionPickerOpen, setCollectionPickerOpen] = useState(false); 
    const [searchProductValue, setSearchProductValue]= useState(''); 
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [selectedVariantIds, setSelectedVariantIds] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [formErrors, setFormErrors] = useState([]);
    const [selectedCollectionVariantIds, setSelectedCollectionVariantIds] = useState([]);
    const [requirementType, setRequirementType] = useState(RequirementType.None);
    const [isFirstButtonActive, setIsFirstButtonActive] = useState(true);

    const [subtotal, setSubtotal] = useState("");
    const [quantity, setQuantity] = useState("");

    useEffect( async () => {
        $('#PolarisCheckbox3').attr('disabled', 'disabled');
    }, [])  

    

    const handleSearchProduct = () => {
        
        setProductPickerOpen(true);
        $('.handle-product-search').val("");
    }

    // Resource provider
    const handleProductSelection = (resources) => {
       
        setProductPickerOpen(false);

        const tempSelectedProducts = [];
        const tempSelectedVariantIds = [];
        const tempSelectedProductIds = [];

        resources.selection.map((product) => {
            tempSelectedProducts.push({id:product.variants[0].id, title:product.title, sku:product.variants[0].sku, img_url:product.images[0].originalSrc});
            tempSelectedVariantIds.push(product.variants[0].id);
            tempSelectedProductIds.push({id:product.id});
        });

        setSelectedProducts(tempSelectedProducts);
        setSelectedVariantIds(tempSelectedVariantIds);
        setSelectedProductIds(tempSelectedProductIds);
    }

    const handleSearchCollection = () => {
        setCollectionPickerOpen(true);
    }

    const handleCollectionSelection = async (resources) => {
       
        setCollectionPickerOpen(false);

        const tempSelectedCollectionIds = [];   
        const tempSelectedCollections = [];

        resources.selection.map((collection) => {
            tempSelectedCollections.push({id:collection.id, title:collection.title});
            tempSelectedCollectionIds.push({id:collection.id});
        });

        setSelectedCollectionIds(tempSelectedCollectionIds);
        setSelectedCollections(tempSelectedCollections);

        tempSelectedCollectionIds.map( async (collection_id)=> {

            const response = await authenticatedFetch("/api/product/variants", {
                method: "POST",
                headers: { 
                    Accept: "application/json",
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({id:collection_id.id})
            });
    
            const data = await response.json();

            data.body.data.collection.products.nodes.map((product)=> {
                selectedCollectionVariantIds.push(product.variants.edges[0].node.id)
            } )
        } )
        
    }

    const handleFirstButtonClick = useCallback( () => {
        if (isFirstButtonActive) return;
        setIsFirstButtonActive(true);
    }, [isFirstButtonActive])


    const handleSecondButtonClick = useCallback( () => {
        if (!isFirstButtonActive) return;
        setIsFirstButtonActive(false);
    }, [isFirstButtonActive])


    // Define base discount form fields
    const {
        fields: {
            discountTitle,
            discountCode,
            discountMethod,
            combinesWith,
            requirementSubtotal,
            requirementQuantity,
            usageTotalLimit,
            usageOncePerCustomer,
            startDate,
            endDate,
            configuration,
            minimumOrder
        },
        submit,
        submitting,
        dirty,
        reset,
        submitErrors,
        makeClean,
    } = useForm({
        fields: {
            discountTitle: useField(""),
            minimumOrder: useField(0),
            discountMethod: useField(DiscountMethod.Code),
            discountCode: useField(""),
            combinesWith: useField({
                orderDiscounts: false,
                productDiscounts: true,
                shippingDiscounts: false,
            }),
            requirementType: useField(RequirementType.None),
            requirementSubtotal: useField("0"),
            requirementQuantity: useField("0"),
            usageTotalLimit: useField(null),
            usageOncePerCustomer: useField(false),
            startDate: useField(todaysDate),
            endDate: useField(null),
            configuration: { // Add quantity and percentage configuration to form data
                quantity: useField('1'),
                percentage: useField('0'),
                value: useField('0'),
              },
        },
        onSubmit: async (form) => {
            // Create the discount using the added express endpoints

            const tempFormErrors = [];

            let variants_arr = [...selectedVariantIds, ...selectedCollectionVariantIds];
            let allSelectedVariantIds = [...new Set(variants_arr)]

            // if(!form.endDate){
            //     tempFormErrors.push("End date is required");
            // } 
            if (!form.discountTitle && form.discountCode==""){
                tempFormErrors.push("Discount title is required");
            }
            // if (form.configuration.percentage < 1 && form.configuration.value < 1){
            //     tempFormErrors.push("Percentage or Fixed Amount must be greater than 0");
            // }
            if (form.configuration.minimumOrder == 0){
                tempFormErrors.push("Please set minimum order amount");
            }
            if (allSelectedVariantIds.length == 0){
                tempFormErrors.push("Please select a free product");
            }

            setFormErrors(tempFormErrors);

            if(tempFormErrors.length > 0){
                return false;
            }
            

            const metafield_value = JSON.stringify({
                quantity: parseInt(form.configuration.quantity),
                percentage: parseFloat(100),
                value: !isFirstButtonActive ? parseFloat(form.configuration.value) : 0,
                variant_ids: allSelectedVariantIds,
                product_ids: selectedProductIds,
                products: selectedProducts,
                collections: selectedCollections,
                collection_ids:selectedCollectionIds,
                discount_method: form.discountCode!=="" ? "Code" : "Automatic",
                discount_type: "order",
                minimum_order: parseFloat(form.minimumOrder),
              });

            const discount = {
                functionId,
                combinesWith: form.combinesWith,
                startsAt: form.startDate,
                endsAt: form.endDate,
                metafields: [
                    {
                        namespace: METAFIELD_NAMESPACE,
                        key: METAFIELD_CONFIGURATION_KEY,
                        type: "json",
                        value: metafield_value,
                    },
                ],
            };

             console.log("DISCOUNT:",discount);

             // SHOP METAFIELD
            let shopInfo = await (await authenticatedFetch("/api/shop")).json();
            let shopMetafieldRequest = authenticatedFetch("/api/metafields/set", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                metafields: [
                    {
                    ownerId: shopInfo.data.shop.id,
                    namespace: "order-discount",
                    key: "free-product",
                    type: "json",
                    value: metafield_value,
                    }
                ],
                }),
            });

            const data_0 = await shopMetafieldRequest;

            let response;
            if (form.discountMethod === DiscountMethod.Automatic) {
                response = await authenticatedFetch("/api/discounts/create/automatic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        discount: {
                          ...discount,
                          title: form.discountTitle,
                        },
                      }),
                });
            } else {
                response = await authenticatedFetch("/api/discounts/create/code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        discount: {
                          ...discount,
                          title: form.discountCode,
                          code: form.discountCode,
                          appliesOncePerCustomer: form.usageOncePerCustomer,
                          usageLimit: parseInt(form.usageTotalLimit)
                        },
                      }),
                });
            }

            const data = (await response.json()).data;
            const remoteErrors = data.discountCreate.userErrors;
            
            console.log(data.discountCreate);

            console.log("remoteErrors", remoteErrors);
            
            let discount_id;
            if(form.discountCode!==""){
                 discount_id = data.discountCreate.codeAppDiscount.discountId;
            }else{
                 discount_id = data.discountCreate.automaticAppDiscount.discountId;
            }

        
            // run metafield update if discount_id is created   
            if(discount_id){
                let update_metafield_endpoint = "/api/discount/update/automatic/metafield";
                if(form.discountMethod !== DiscountMethod.Automatic){
                    update_metafield_endpoint = "/api/discount/update/code/metafield";
                }
                const response2 = await authenticatedFetch(update_metafield_endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        value: metafield_value,
                        discount_id: discount_id
                    }),
                });

                const data2 = (await response2.json()).data;
                console.log(data2);

            }
            

            if (remoteErrors.length > 0) {
                tempFormErrors.push(remoteErrors[0].message);
                return { status: "fail", errors: remoteErrors };
            }

            redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
                name: Redirect.ResourceType.Discount,
            });
            return { status: "success" };
        },
    });

    const errorBanner =
        formErrors.length > 0 ? (
            <Layout.Section>
                <Banner status="critical">
                    <p>There were some issues with your form submission:</p>
                    <ul>
                        {formErrors.map((message, index) => {
                            return (
                                <li key={index}>
                                   {message}
                                </li>
                            );
                        })}
                    </ul>
                </Banner>
            </Layout.Section>
        ) : null;

    return (
        // Render a discount form using Polaris components and the discount app components
        <Page
            title="Create gift discount"
            breadcrumbs={[
                {
                    content: "Discounts",
                    onAction: () => onBreadcrumbAction(redirect, true),
                },
            ]}
            primaryAction={{
                content: "Save",
                onAction: submit,
                disabled: !dirty,
                loading: submitting,
            }}
        >
            <Layout>
                {errorBanner}
                <Layout.Section>
                    <form onSubmit={submit}>
                        <MethodCard
                            title="Volume"
                            discountTitle={discountTitle}
                            discountClass={DiscountClass.Product}
                            discountCode={discountCode}
                            discountMethod={discountMethod}
                        />
                        <div id="volume" style={{marginTop:'16px', marginBottom:'16px'}}>
                            <LegacyCard title="Value">
                            <LegacyCard.Section>
                                    <LegacyStack distribution="fill">
                                        <div style={{marginBottom:"15px", marginTop:"15px"}}>
                                            <TextField label="Minimum order amount:" {...minimumOrder} />
                                        </div>
                                    </LegacyStack>
                                    {/* <LegacyStack>
                                            <LegacyStack.Item>
                                                <div style={{width:"120px"}}>
                                                <TextField label="Minimum qty." {...configuration.quantity} />
                                                </div>
                                            </LegacyStack.Item>
                                            <LegacyStack.Item fill>
                                                
                                            <Text>
                                                <div style={{marginBottom:"3px"}}>
                                                Type
                                                </div>
                                            </Text>
                                                <LegacyStack>
                                                <LegacyStack.Item>
                                                    <ButtonGroup segmented >
                                                        <Button
                                                        pressed={isFirstButtonActive}
                                                        onClick={handleFirstButtonClick}
                                                        >Percentage</Button>
                                                        <Button
                                                        pressed={!isFirstButtonActive}
                                                        onClick={handleSecondButtonClick}
                                                        >FixedAmount</Button>
                                                    </ButtonGroup>
                                                    </LegacyStack.Item>
                                                    <LegacyStack.Item>
                                                    <div style={{width:"150px"}}>
                                                        {
                                                        isFirstButtonActive ? (
                                                            
                                                            <TextField 
                                                                {...configuration.percentage}
                                                                suffix="%"
                                                                placeholder="0"
                                                            />
                                                            
                                                        ) : (
                                                            
                                                            <TextField 
                                                                {...configuration.value}
                                                                prefix="$"
                                                                placeholder="0.00"
                                                            />
                                                        
                                                        )
                                                        }
                                                    </div>
                                                    </LegacyStack.Item>
                                                    </LegacyStack>
                                            </LegacyStack.Item>
                                
                                    </LegacyStack> */}
                               
                                    <LegacyStack distribution="fill">
  
                                        <VerticalStack gap="1"> 
                                            <Text>Select free product</Text>
                                            <input 
                                                className="handle-product-search"
                                                type="text" 
                                                placeholder="Search products / update list" 
                                                onClick={handleSearchProduct} 
                                                onKeyDown={handleSearchProduct}
                                                style={{padding:'10px', border:'none', borderStyle:'solid', borderWidth:'1px', borderRadius:'4px'}}
                                            />
                                        </VerticalStack>    

                                    </LegacyStack>

                                    <ResourcePicker 
                                        resourceType='Product'
                                        open={productPickerOpen}
                                        onSelection={(resources) => handleProductSelection(resources)}
                                        onCancel={() => setProductPickerOpen(false)}
                                        initialSelectionIds = {selectedProductIds}
                                    />
                                     <div id="selected-product-card">
                                        {selectedProducts && selectedProducts.map((product, index)=> 
                                        <SelectedProductCard key={index} product= {product} />
                                        )}
                                    </div>

                                    {/* <LegacyStack distribution="fill">
                                        <div style={{marginTop:'20px', marginBottom:'20px'}}>
                                        <VerticalStack gap="1"> 
                                            <Text>Apply discount to collections</Text>
                                            <input 
                                                type="text" 
                                                placeholder="Search collection / update list" 
                                                onClick={handleSearchCollection} 
                                                style={{padding:'10px', border:'none', borderStyle:'solid', borderWidth:'1px', borderRadius:'4px'}}
                                            />
                                        </VerticalStack>    
                                        </div>
                                    </LegacyStack>

                                    <ResourcePicker 
                                        resourceType='Collection'
                                        open={collectionPickerOpen}
                                        onSelection={(resources) => handleCollectionSelection(resources)}
                                        onCancel={() => setCollectionPickerOpen(false)}
                                        initialSelectionIds = {selectedCollectionIds}          
                                    />

                                    <div id="selected-collection-card">
                                        {selectedCollections && selectedCollections.map((collection, index)=> 
                                        <SelectedCollectionCard key={index} collection= {collection} />
                                        )}
                                    </div>  */}
                                </LegacyCard.Section>

                                
                            </LegacyCard>
                        </div>

                        {discountMethod.value === DiscountMethod.Code && (
                            <UsageLimitsCard
                                totalUsageLimit={usageTotalLimit}
                                oncePerCustomer={usageOncePerCustomer}
                            />
                        )}

                        <CombinationCard
                            combinableDiscountTypes={combinesWith}
                            discountClass={DiscountClass.Product}
                            discountDescriptor={
                                discountMethod.value === DiscountMethod.Automatic
                                    ? discountTitle.value
                                    : discountCode.value
                            }
                        />
                        <div id="active-dates" style={{marginTop:'20px'}}>
                        <ActiveDatesCard
                            startDate={startDate}
                            endDate={endDate}
                            timezoneAbbreviation="EST"
                        />
                        </div>
                    </form>
                </Layout.Section>
                <Layout.Section secondary>
                    <SummaryCard
                        header={{
                            discountMethod: discountMethod.value,
                            discountDescriptor:
                                discountMethod.value === DiscountMethod.Automatic
                                    ? discountTitle.value
                                    : discountCode.value,
                            appDiscountType: "Volume",
                            isEditing: false,
                        }}
                        performance={{
                            status: DiscountStatus.Scheduled,
                            usageCount: 0,
                        }}
                        minimumRequirements={{
                            requirementType: requirementType.value,
                            subtotal: requirementSubtotal.value,
                            quantity: requirementQuantity.value,
                            currencyCode: currencyCode,
                        }}
                        usageLimits={{
                            oncePerCustomer: usageOncePerCustomer.value,
                            totalUsageLimit: usageTotalLimit.value,
                        }}
                        activeDates={{
                            startDate: startDate.value,
                            endDate: endDate.value,
                        }}
                    />
                </Layout.Section>
                <Layout.Section>
                {errorBanner}
                    <PageActions
                        primaryAction={{
                            content: "Save discount",
                            onAction: submit,
                            disabled: !dirty,
                            loading: submitting,
                        }}
                        secondaryActions={[
                            {
                                content: "Discard",
                                onAction: () => onBreadcrumbAction(redirect, true),
                            },
                        ]}
                    />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
