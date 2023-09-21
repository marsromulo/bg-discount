import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useForm, useField } from "@shopify/react-form";
import { CurrencyCode } from "@shopify/react-i18n";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge, ResourcePicker } from "@shopify/app-bridge-react";
import SelectedCollectionCard from "../../../components/SelectedCollectionCard";

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
    Text,
    InlineError,
    LegacyStack,
    LegacyCard,
    Checkbox,
    ButtonGroup,
    Button,
} from "@shopify/polaris";
import { data } from "@shopify/app-bridge/actions/Modal";
import { useAuthenticatedFetch } from "../../../hooks";

const todaysDate = new Date();
// Metafield that will be used for storing function configuration
const METAFIELD_NAMESPACE = "$app:collection-discount";
const METAFIELD_CONFIGURATION_KEY = "function-configuration";

export default function VolumeNew() {
    // Read the function ID from the URL
    const { functionId } = useParams();

    const app = useAppBridge();
    const redirect = Redirect.create(app);
    const currencyCode = CurrencyCode.Cad;
    const authenticatedFetch = useAuthenticatedFetch();

    const [productPickerOpen, setProductPickerOpen] = useState(false); 
    const [collectionPickerOpen, setCollectionPickerOpen] = useState(false); 

    const [selectedCollections, setSelectedCollections] = useState([]);
    const [selectedCollectionIds, setSelectedCollectionIds] = useState([]);
    const [selectedCollectionVariantIds, setSelectedCollectionVariantIds] = useState([]);
    const [collectionIds, setCollectionIds] = useState([]);
    const [formErrors, setFormErrors] = useState([]);

    const [isFirstButtonActive, setIsFirstButtonActive] = useState(true);

    // useEffect( async () => {
    //     $('#PolarisCheckbox3').attr('disabled', 'disabled');
    // }, [])  

    

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
            discountTitle: useField(""),
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
                collections: selectedCollections,
                collection_ids:selectedCollectionIds,
                selectedCollectionIds:collectionIds,
                variant_ids: selectedCollectionVariantIds,
                discount_method: form.discountCode!=="" ? "Code" : "Automatic",
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

             console.log("DISCOUNT:",discount);

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
            title="Create collection discount"
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
                    <div style={{padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff'}}>
                        <MethodCard
                            title="Collection"
                            discountTitle={discountTitle}
                            discountClass={DiscountClass.Product}
                            discountCode={discountCode}
                            discountMethod={discountMethod}
                        />
                    </div>
                        <div id="volume" style={{marginTop:'16px', marginBottom:'16px'}}>
                            <LegacyCard title="Value">
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
                                            <Text variant="headingSm" as="h6">Apply discount to collection</Text>
                                            <input 
                                                type="text" 
                                                placeholder="Search / update collection" 
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
                                    </div> 

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
                        <div id="active-dates" style={{padding:'20px', borderRadius:'.5rem', backgroundColor:'#ffffff', marginTop:'20px'}}>
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
