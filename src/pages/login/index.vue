
<script setup lang="ts">
import { ref } from 'vue';
import { lightTheme, NForm, NFormItem, NButton, NInput, NRow, NCol, NConfigProvider } from 'naive-ui';
import "../../style/style.less"

const form = ref({
    account: '',
    password: ''
});

const rules = {
    account: [
        {
            required: true,
            message: '请输入账户',
            trigger: 'blur'
        }
    ],
    password: [
        {
            required: true,
            message: '请输入密码',
            trigger: 'blur'
        }
    ]
};

const loading = ref(false);
</script>

<template>
    <n-config-provider :theme="lightTheme">
        <div class="layout">
            <div class="l_body">
                <h1>MineShowcase</h1>
                <h2>管理实用程序</h2>
            </div>
            <div class="r_body">
                <h2>登录</h2>
                <n-form :model="form" :rules="rules">
                    <n-form-item path="account" label="账户">
                        <n-input v-model:value="form.account" @keydown.enter.prevent />
                    </n-form-item>
                    <n-form-item path="password" label="密码">
                        <n-input type="password" v-model:value="form.password" @keydown.enter.prevent />
                    </n-form-item>
                    <n-row :gutter="[0, 24]">
                        <n-col :span="24">
                            <div style="display: flex; justify-content: flex-end">
                                <n-button type="primary" :loading="loading">
                                    登录
                                </n-button>
                            </div>
                        </n-col>
                    </n-row>
                </n-form>
            </div>
        </div>
    </n-config-provider>
</template>

<style scoped lang="less">
.layout {
    box-sizing: border-box;
    height: 100vh;
    background-image: url('../../assets/bg.webp');
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;

    .l_body {
        box-sizing: border-box;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        h1 {
            text-align: center;
            font-size: 50px;
            font-weight: bold;
            color: transparent;
            background: linear-gradient(to right, #32defd, #f74598);
            -webkit-background-clip: text;
            background-clip: text;
        }

        h2 {
            text-align: center;
            font-size: 25px;
            color: white;
        }
    }

    .r_body {
        box-sizing: border-box;
        width: 400px;
        padding: 2rem;
        background-color: rgba(255, 255, 255, 0.6);
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        margin-right: 30px;

        h2 {
            margin-bottom: 20px;
            text-align: center;
        }

        .n-form-item {
            margin-bottom: 20px;
        }
    }

    @media screen and (max-width: 768px) {
        flex-direction: column;
        padding: 20px;

        .l_body {
            padding-bottom: 20px;
        }

        .r_body {
            width: 100%;
            margin-right: 0;
        }
    }
}
</style>