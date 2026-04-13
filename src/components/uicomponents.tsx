import Box from "@/src/components/shared/Box";
import Button from "@/src/components/shared/Button";
import Checkbox from "@/src/components/shared/Checkbox";
import DottedSpinner from "@/src/components/shared/DottedSpinner";
import ProgressPagination from "@/src/components/shared/ProgressPagination";
import Radio from "@/src/components/shared/Radio";
import Switch from "@/src/components/shared/Switch";
import theme from "@/src/theme/theme";
import { useState } from "react";
import { View } from "react-native";

export default function Index() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isSelected, setIsSelected] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.colors.mainBackground,
            }}
        >
            <Box gap={'xl'} alignItems="center">
                <Button label="Cycle Progress" onPress={() => setActiveIndex((prev) => (prev + 1) % 3)} />

                <ProgressPagination total={3} activeIndex={activeIndex} />

                <Box flexDirection="row" gap="m">
                    <Switch
                        value={isEnabled}
                        onValueChange={(val) => setIsEnabled(val)}
                    />

                    <Checkbox
                        checked={isChecked}
                        onChange={(val) => setIsChecked(val)}
                    />

                    <Radio
                        selected={isSelected}
                        onSelect={() => setIsSelected(!isSelected)}
                    />
                </Box>

                <DottedSpinner size={32} />
            </Box>
        </View>
    );
}
