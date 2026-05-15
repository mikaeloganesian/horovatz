import { createContext, useContext } from 'react';
import type { ReactNode, FC } from 'react';
import { rootStore, RootStore } from '../stores/RootStore';

export const StoreContext = createContext<RootStore>(rootStore);

export const StoreProvider: FC<{children: ReactNode}> = ({ children }) => {
    return (
        <StoreContext.Provider value={rootStore}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    return useContext(StoreContext);
};
