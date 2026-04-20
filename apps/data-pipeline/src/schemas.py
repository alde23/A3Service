from pydantic import BaseModel, Field

class TechnicalSpec(BaseModel):
    parameter: str = Field(description="The name of the specification, e.g., 'Maximum heat output'")
    value: str = Field(description="The value and unit, e.g., '31.0 kW'")

class FaultCode(BaseModel):
    code: str = Field(description="The exact alphanumeric fault code (e.g., F.22, EA).")
    description: str = Field(description="A short description of the fault.")
    possible_causes: list[str] = Field(description="Possible reasons for the fault. Empty list if none.")
    troubleshooting_steps: list[str] = Field(description="Steps to fix the fault. Empty list if none.")

class BoilerManualData(BaseModel):
    brand_name: str = Field(description="The manufacturer, e.g., Vaillant, Bosch.")
    model_name_or_number: str = Field(description="The specific model name or numbers covered.")
    technical_data: list[TechnicalSpec] = Field(description="List of technical specifications.")
    fault_codes: list[FaultCode] = Field(description="List of fault codes found in the manual.")