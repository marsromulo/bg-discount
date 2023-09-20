import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useForm, useField } from "@shopify/react-form";
import { CurrencyCode } from "@shopify/react-i18n";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge, ResourcePicker } from "@shopify/app-bridge-react";
import SelectedProductCard from '../../../components/SelectedProductCard';

import {
    ActiveDatesCard,
    CombinationCard,
    DiscountClass,
    DiscountMethod,
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
    LegacyCard,
    LegacyStack,
    Text,
    Button,
    Modal,
    ButtonGroup,
} from "@shopify/polaris";
import { data } from "@shopify/app-bridge/actions/Modal";
import { useAuthenticatedFetch } from "../../../hooks";

const todaysDate = new Date();


// Metafield that will be used for storing function configuration
const METAFIELD_NAMESPACE = "$app:order-discount";
const METAFIELD_CONFIGURATION_KEY = "function-configuration";

export default function OrderEdit() {
    // Read the function ID from the URL
    const { functionId, id } = useParams();

    // console.log(id);

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

    const [_discount_method, setDiscountMethod] = useState('Code');
    const [_title, setTitle] = useState('');
    const [date_starts_at, setDateStartAt] = useState('');
    const [_ends_at, setEndsAt] = useState('');
    const [_starts_at, setStartsAt] = useState('');
    const [_order_discounts, setOrderDiscounts] = useState(false);  
    const [_product_discounts, setProductDiscounts] = useState(false);
    const [_shipping_discounts, setShippingDiscounts] = useState(false);
    const [_usage_once_per_customer, setUsageOncePerCustomer] = useState(false);
    const [_usage_limit, setUsageLimit] = useState(0);
    const [_quantity, setQuantity] = useState(0);
    const [_percentage, setPercentage] = useState(0);
    const [_minimum_order, setMinimumOrder] = useState(0);
    const [_value, setValue] = useState(0);
    const [_metafield_id, setMetafieldId] = useState('');
    const [_temp_start_date, setTempStartDate] = useState('');
    const [_temp_end_date, setTempEndDate] = useState('');
    const [formErrors, setFormErrors] = useState([]);
    const [selectedCollectionVariantIds, setSelectedCollectionVariantIds] = useState([]);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [isFirstButtonActive, setIsFirstButtonActive] = useState(true);


    useEffect( async () => {
        
        const response = await authenticatedFetch("/api/discount/node", {
            method: "POST",
            headers: { 
                Accept: "application/json",
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({id:`gid://shopify/DiscountAutomaticNode/${id}`})
        });

        const data = await response.json();
        
        console.log("DATA:",data);
        console.log("DISCOUNT_ID:", id);

        const info = data.body.data.discountNode.discount;
        const metafields = JSON.parse(data.body.data.discountNode.metafields.nodes[0].value);
        const metafield_id = data.body.data.discountNode.metafields.nodes[0].id;

        console.log("METAFIELD_ID:", metafield_id);

        const orig_start_date = info.startsAt;

        const split_start_date = orig_start_date.split("T");
        
        const start_date_formatted = new Date(info.startsAt);

        const new_start_date = start_date_formatted.toString();

        setDiscountMethod(metafields.discount_method)
        setTitle(info.title);
        setDateStartAt(new_start_date);
        setStartsAt(info.startsAt);
        setEndsAt(info.endsAt);
        setUsageOncePerCustomer(info.appliesOncePerCustomer ?? false);
        setUsageLimit(info.usageLimit ?? null);
        setOrderDiscounts(info.combinesWith.orderDiscounts);
        setProductDiscounts(info.combinesWith.productDiscounts);
        setShippingDiscounts(info.combinesWith.shippingDiscounts);
        setQuantity(metafields.quantity);
        setPercentage(metafields.percentage);
        setMinimumOrder(metafields.minimum_order);
        setValue(metafields.value);
        setSelectedVariantIds(metafields.variant_ids);
        setSelectedProducts(metafields.products);
        setSelectedProductIds(metafields.product_ids);
        setSelectedCollections(metafields.collections);
        setSelectedCollectionIds(metafields.collection_ids);
        setMetafieldId(metafield_id);
        setIsFirstButtonActive(metafields.percentage ? true : false);
  
        // $('#PolarisCheckbox3').attr('disabled', 'disabled'); // disable Other Product Discount
        // $("#PolarisComboboxTextField1").val(split_start_date[1].substring(0, 5)).attr('disabled', 'disabled');


    }, [])  
   
    const handleSearchProduct = () => {
        
        setProductPickerOpen(true);
        // $('.handle-product-search').val("");
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
            requirementType,
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
            discountTitle: useField(_title),
            minimumOrder: useField(_minimum_order),
            discountMethod: useField(_discount_method),
            discountCode: useField(_title),
            combinesWith: useField({
                orderDiscounts: _order_discounts,
                productDiscounts: _product_discounts,
                shippingDiscounts: _shipping_discounts,
            }),
            requirementType: useField(RequirementType.None),
            requirementSubtotal: useField("0"),
            requirementQuantity: useField("0"),
            usageTotalLimit: useField(_usage_limit),
            usageOncePerCustomer: useField(_usage_once_per_customer),
            startDate: useField(todaysDate),
            endDate: useField(_ends_at),
            configuration: { // Add quantity and percentage configuration to form data
                quantity: useField(_quantity),
                percentage: useField(_percentage),
                value: useField(_value),
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
            if (allSelectedVariantIds.length == 0){
                tempFormErrors.push("Please select a free product");
            }

            if (form.configuration.minimumOrder == 0){
                tempFormErrors.push("Please set minimum order amount");
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
                discount_method: form.discountMethod === DiscountMethod.Automatic ? "Automatic" : "Code",
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
                response = await authenticatedFetch("/api/discounts/update/automatic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        discount: {
                          title: form.discountTitle,
                          endsAt: form.endDate,
                          productDiscounts: form.combinesWith.productDiscounts,
                          shippingDiscounts: form.combinesWith.shippingDiscounts,
                        },
                        discount_id: "gid://shopify/DiscountAutomaticNode/"+id
                      }),
                });
            } else {
                response = await authenticatedFetch("/api/discounts/update/code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        discount: {
                          ...discount,
                          title: form.discountCode,
                          code: form.discountCode,
                          endsAt: form.endDate,
                          productDiscounts: form.combinesWith.productDiscounts,
                          shippingDiscounts: form.combinesWith.shippingDiscounts,
                          appliesOncePerCustomer: form.usageOncePerCustomer,
                          usageLimit: parseInt(form.usageTotalLimit)
                        },
                        discount_id: "gid://shopify/DiscountCodeNode/"+id
                      }),
                });
            }

            const data = (await response.json()).body.data;
            console.log("RESPONSE UPDATE", data);
            
            // run metafield update since discount Id is already given
            if(id){
                let response2;
                let update_metafield_endpoint = "/api/discount/update/automatic/metafield/edit";
                let discount_id = "gid://shopify/DiscountAutomaticNode/"+id;

                if(form.discountMethod !== DiscountMethod.Automatic){
                    update_metafield_endpoint = "/api/discount/update/code/metafield/edit";
                    discount_id = "gid://shopify/DiscountCodeNode/"+id;
                }
                 response2 = await authenticatedFetch(update_metafield_endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        value: metafield_value,
                        metafield_id: _metafield_id,
                        discount_id: discount_id
                    }),
                });

                const data2 = (await response2.json()).body.data;
                console.log("DATA 2",data2);
                console.log("DISCOUNT ID", discount_id);

            }
            
            let remoteErrors;

            if(form.discountMethod === DiscountMethod.Automatic){
                remoteErrors = data.discountAutomaticAppUpdate.userErrors;
            }else{
                remoteErrors = data.discountCodeAppUpdate.userErrors;
            }

            if (remoteErrors.length > 0) {
                tempFormErrors.push(remoteErrors[0].message);
                return { status: "fail", errors: remoteErrors };
            }else{
                setSubmitSuccess(true);
                return { status: "success" };
            }

            // redirect.dispatch(Redirect.Action.ADMIN_SECTION, {
            //     name: Redirect.ResourceType.Discount,
            // });
            // return { status: "success" };
            
        },
    });

    const errorBanner =
        submitErrors.length > 0 ? (
            <Layout.Section>
                <Banner status="critical">
                    <p>There were some issues with your form submission:</p>
                    <ul>
                        {submitErrors.map(({ message, field }, index) => {
                            return (
                                <li key={`${message}${index}`}>
                                    {field.join(".")} {message}
                                </li>
                            );
                        })}
                    </ul>
                </Banner>
            </Layout.Section>
        ) : null;

    const successBanner = submitSuccess ? (
        <Layout.Section>
            <Banner status="success">
                <p>Update Success !</p>
            </Banner>
        </Layout.Section>
    ) : null;

    return (
        // Render a discount form using Polaris components and the discount app components
        <Page
            title=" Edit gift discount"
            breadcrumbs={[
                {
                    content: "Discounts",
                    onAction: () => onBreadcrumbAction(redirect, true),
                },
            ]}
            primaryAction={{
                content: "Update",
                onAction: submit,
                disabled: !dirty,
                loading: submitting,
            }}
        >
            <Layout>
                {errorBanner}
                {successBanner}
                <Layout.Section>
                    <form onSubmit={submit}>
                    <div id="method-card"  style={{padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff'}}>
                        <MethodCard
                            title="Volume"
                            discountTitle={discountTitle}
                            discountClass={DiscountClass.Product}
                            discountCode={discountCode}
                            discountMethod={discountMethod}
                        />
                        </div>
                        <div id="volume" style={{marginTop:'16px', marginBottom:'16px'}}>
                        <LegacyCard title="Value">
                        <LegacyCard.Section>
                                    <LegacyStack distribution="fill">
                                        <div style={{marginBottom:"15px", marginTop:"15px"}}>
                                            <TextField label="Minimum order amount:" {...minimumOrder} />
                                        </div>
                                    </LegacyStack>
                               
                                <LegacyStack distribution="fill">
                                    <div style={{marginTop: '10px', marginBottom:'10px'}}>
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
                                    </div>
                                </LegacyStack>

                                <ResourcePicker 
                                    resourceType='Product'
                                    open={productPickerOpen}
                                    onSelection={(resources) => handleProductSelection(resources)}
                                    onCancel={() => setProductPickerOpen(false)}
                                    initialSelectionIds = {selectedProductIds}
                                
                                />
                                {
                                selectedProducts.length > 0 ? <div>
                                    {selectedProducts && selectedProducts.map((product, index)=> 
                                    <SelectedProductCard key={index} product= {product} />
                                    )}
                                </div>:<div>No product</div>
                                }
                            
                                

                            </LegacyCard.Section>

                        </LegacyCard>
                        </div>
                        
                        {discountMethod.value === DiscountMethod.Code && (
                            <div style={{padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff'}}>
                            <UsageLimitsCard
                                totalUsageLimit={usageTotalLimit}
                                oncePerCustomer={usageOncePerCustomer}
                            />
                            </div>
                        )}
                        <div style={{padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff', marginTop:'20px'}}>
                        <CombinationCard
                            combinableDiscountTypes={combinesWith}
                            discountClass={DiscountClass.Product}
                            discountDescriptor={
                                discountMethod.value === DiscountMethod.Automatic
                                    ? discountTitle.value
                                    : discountCode.value
                            }
                        />
                        </div>
              
                        <div id="active-dates" style={{marginTop:'20px', padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff'}}>
                        <ActiveDatesCard
                            startDate={startDate}
                            endDate={endDate}
                            timezoneAbbreviation="EST"
                        />
                        </div>
         
                    </form>
                </Layout.Section>
                <Layout.Section secondary>
                    <div style={{padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff'}}>
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
                    </div>
                </Layout.Section>
                <Layout.Section>
                {errorBanner}
                {successBanner}
                    <PageActions
                        primaryAction={{
                            content: "Update discount",
                            onAction: submit,

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
