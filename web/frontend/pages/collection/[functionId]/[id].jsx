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
    ButtonGroup,
    Modal,
    TextContainer,
    Checkbox
} from "@shopify/polaris";
import { data } from "@shopify/app-bridge/actions/Modal";
import { useAuthenticatedFetch } from "../../../hooks";

const todaysDate = new Date();


// Metafield that will be used for storing function configuration
const METAFIELD_NAMESPACE = "$app:collection-discount";
const METAFIELD_CONFIGURATION_KEY = "function-configuration";

export default function VolumeEdit() {
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
    const [selectedCollections, setSelectedCollections] = useState([]);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedCollectionVariantIds, setSelectedCollectionVariantIds] = useState([]);
    const [collectionIds, setCollectionIds] = useState([]);
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
    const [_value, setValue] = useState(0);
    const [_metafield_id, setMetafieldId] = useState('');

    const [_temp_start_date, setTempStartDate] = useState('');
    const [_temp_end_date, setTempEndDate] = useState('');
    const [formErrors, setFormErrors] = useState([]);
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


        const info = data.body.data.discountNode.discount;
        const metafields = JSON.parse(data.body.data.discountNode.metafields.nodes[0].value);
        const metafield_id = data.body.data.discountNode.metafields.nodes[0].id;

        const orig_start_date = info.startsAt;

        const split_start_date = orig_start_date.split("T");
        
        const start_date_formatted = new Date(info.startsAt);

        const new_start_date = start_date_formatted.toString();


        setDiscountMethod(metafields.discount_method)
        setTitle(info.title);
        setDateStartAt(new_start_date);
        setStartsAt(info.startsAt);
        setUsageOncePerCustomer(info.appliesOncePerCustomer ?? false);
        setUsageLimit(info.usageLimit ?? null);
        setEndsAt(info.endsAt);
        setOrderDiscounts(info.combinesWith.orderDiscounts);
        setProductDiscounts(info.combinesWith.productDiscounts);
        setShippingDiscounts(info.combinesWith.shippingDiscounts);
        setQuantity(metafields.quantity);
        setPercentage(metafields.percentage);
        setValue(metafields.value);
        setSelectedCollections(metafields.collections);
        setSelectedCollectionIds(metafields.collection_ids);
        setCollectionIds(metafields.selectedCollectionIds)
        setMetafieldId(metafield_id);
        setIsFirstButtonActive(metafields.percentage ? true : false);
  
        $('#PolarisCheckbox3').attr('disabled', 'disabled'); // disable Other Product Discount
        $('#PolarisTextField4').val(split_start_date[0]).attr('disabled', 'disabled');
        $("#PolarisComboboxTextField1").val(split_start_date[1].substring(0, 5)).attr('disabled', 'disabled');


    }, [])  
   

    // Resource provider

    const handleSearchCollection = () => {
        setCollectionPickerOpen(true);
    }

    const handleCollectionSelection = async (resources) => {
       
        setCollectionPickerOpen(false);

        const tempSelectedCollectionIds = [];   
        const tempSelectedCollections = [];
        const tempCollectionIds = [];

        resources.selection.map((collection) => {
            tempSelectedCollections.push({id:collection.id, title:collection.title});
            tempSelectedCollectionIds.push({id:collection.id});
            tempCollectionIds.push(collection.id);
        });

        setSelectedCollectionIds(tempSelectedCollectionIds);
        setSelectedCollections(tempSelectedCollections);
        setCollectionIds(tempCollectionIds);

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
            
            const tempFormErrors = [];
            if (!form.discountTitle && form.discountCode==""){
                tempFormErrors.push("Discount title is required");
            }
            if (form.configuration.percentage < 1 && form.configuration.value < 1){
                tempFormErrors.push("Percentage or Fixed Amount must be greater than 0");
            }
            if (collectionIds.length == 0){
                tempFormErrors.push("Please add collection");
            }

            setFormErrors(tempFormErrors);

            if(tempFormErrors.length > 0){
                return false;
            }

            const metafield_value = JSON.stringify({
                quantity: parseInt(form.configuration.quantity),
                percentage: isFirstButtonActive ? parseFloat(form.configuration.percentage) : 0,
                value: !isFirstButtonActive ? parseFloat(form.configuration.value) : 0,
                collection_ids:selectedCollectionIds,
                collections: selectedCollections,
                selectedCollectionIds:collectionIds,
                variant_ids: selectedCollectionVariantIds,
                discount_method: form.discountMethod === DiscountMethod.Automatic ? "Automatic" : "Code",
                discount_type: "collection"
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
            console.log("RESPONSE", data);

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
            title="Edit collection discount"
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
                        <div id="method-card">
                        <MethodCard
                            title="Volume"
                            discountTitle={discountTitle}
                            discountClass={DiscountClass.Product}
                            discountCode={discountCode}
                            discountMethod={discountMethod}
                        />
                        </div>
                        <div id="volume" style={{marginTop:'16px', marginBottom:'16px'}}>
                        <LegacyCard title="Volume">
                        <LegacyCard.Section>
                                    <LegacyStack>
                                            <LegacyStack.Item>
                                                <div style={{width:"160px"}}>
                                                <TextField label="Minimum # of items." {...configuration.quantity} />
                                                </div>
                                            </LegacyStack.Item>
                                            <LegacyStack.Item fill>
                                            <Text><div style={{marginBottom:"3px"}}>Type</div></Text>
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
                                                    <div style={{width:"130px"}}>
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
                                
                                    </LegacyStack>
                                </LegacyCard.Section>
                            <LegacyCard.Section>
                                
                                <LegacyStack distribution="fill">
                                    <div style={{marginTop:'20px', marginBottom:'20px'}}>
                                        <VerticalStack gap="1"> 
                                            <Text variant="headingSm" as="h6">Apply discount to collections</Text>
                                            <input 
                                                type="text" 
                                                placeholder="Search / update collections" 
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

                                {
                                selectedCollections.length > 0 ? <div>
                                    {selectedCollections && selectedCollections.map((collection, index)=> 
                                    <SelectedCollectionCard key={index} collection= {collection} />
                                    )}
                                    </div>:<div>No collection</div>
                                }

                                
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
